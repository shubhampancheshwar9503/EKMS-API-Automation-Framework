$lines = Get-Content "C:\Users\ShubhamPancheshwar\.gemini\antigravity-ide\brain\da43d395-bb20-4b3a-a90e-3792ac4fdfe1\.system_generated\logs\transcript.jsonl"
foreach ($line in $lines) {
  $step = $line | ConvertFrom-Json
  if ($step.step_index -eq 144 -and $step.content -like '*ekms_api_orchestrator*') {
    $step.content | Set-Content "_step144_raw.txt"
    Write-Host "Saved step 144, content length:" $step.content.Length
    break
  }
}
