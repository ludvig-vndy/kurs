# Syntetiserar en textfil till wav med Windows inbyggda WinRT-röster (t.ex. Microsoft
# Bengt, sv-SE). v0-röst för demo; i produktion byts detta steg mot neural TTS bakom
# samma manus. Anropas av motor/ljud.mjs.
param(
  [Parameter(Mandatory=$true)][string]$TextFile,
  [Parameter(Mandatory=$true)][string]$OutFile,
  [string]$Voice='Bengt'
)
$null=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($WinRtTask,$ResultType){
  $asTask=$asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask=$asTask.Invoke($null,@($WinRtTask))
  $netTask.Wait() | Out-Null
  $netTask.Result
}
$synth=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::new()
$v=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object {$_.DisplayName -like "*$Voice*"} | Select-Object -First 1
if(-not $v){Write-Error "Ingen röst matchar '$Voice'. Installerade: $(([Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | ForEach-Object {$_.DisplayName}) -join ', ')";exit 1}
$synth.Voice=$v
$text=[IO.File]::ReadAllText($TextFile,[Text.Encoding]::UTF8)
$stream=Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
$input=$stream.GetInputStreamAt(0)
$reader=[Windows.Storage.Streams.DataReader]::new($input)
$size=[uint32]$stream.Size
Await ($reader.LoadAsync($size)) ([uint32]) | Out-Null
$bytes=New-Object byte[] $size
$reader.ReadBytes($bytes)
[IO.File]::WriteAllBytes($OutFile,$bytes)
Write-Output ("OK: {0} · röst {1} · {2:n0} byte" -f $OutFile,$v.DisplayName,$bytes.Length)
