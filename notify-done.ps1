# Claude Code completion notification
# For Stop hook — sends Toast notification + reports to Dashboard

# Report to Dashboard (if running) — fire and forget
try {
    $reportBody = @{ pid = $PID; cwd = (Get-Location).Path } | ConvertTo-Json -Compress
    Invoke-WebRequest -Uri "http://127.0.0.1:23847/api/session-done" -Method POST -Body $reportBody -ContentType "application/json" -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null
} catch { }

# Send Windows Toast notification
try {
    [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    [void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]

    $title = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("Q2xhdWRlIENvZGU="))
    $body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("5Lu75YuZ5bey5a6M5oiQ77yM6KuL5YiH5o+b5Zue5p+l55yL57WQ5p6c"))

    $template = @"
<toast duration="short">
  <visual>
    <binding template="ToastGeneric">
      <text>$title</text>
      <text>$body</text>
    </binding>
  </visual>
  <audio src="ms-winsoundevent:Notification.Default"/>
</toast>
"@

    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe")
    $notifier.Show($toast)
}
catch {
    [Console]::Beep(800, 300)
    [Console]::Beep(1000, 300)
}
