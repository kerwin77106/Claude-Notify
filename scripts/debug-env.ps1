# Dump all CLAUDE* env vars
Get-ChildItem env: | Where-Object { $_.Name -match 'CLAUDE|SESSION' } | ForEach-Object { "$($_.Name)=$($_.Value)" } | Out-File -FilePath "$env:TEMP\claude-hook-env.log" -Encoding utf8

# Also dump stdin
$stdin = [Console]::In.ReadToEnd()
"STDIN=$stdin" | Out-File -Append -FilePath "$env:TEMP\claude-hook-env.log" -Encoding utf8
