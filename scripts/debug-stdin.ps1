param([string]$Event)
$input = [Console]::In.ReadToEnd()
$input | Out-File -FilePath "$env:TEMP\claude-hook-stdin-$Event.log" -Encoding utf8
