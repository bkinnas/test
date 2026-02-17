# search-outlook.ps1
# Searches local Outlook mailbox for invoice emails via COM automation.
# Called from Node.js via child_process.
#
# Parameters (passed as JSON via -Params):
#   senderPatterns  - array of sender email/name substrings to match
#   dateFrom        - start date (yyyy-MM-dd)
#   dateTo          - end date (yyyy-MM-dd)
#   subjectKeywords - array of subject keywords (optional)
#   outputDir       - directory to save attachments
#   folderPath      - Outlook folder path to search (default: Inbox)

param(
    [Parameter(Mandatory=$true)]
    [string]$ParamsJson
)

$ErrorActionPreference = "Stop"

try {
    $params = $ParamsJson | ConvertFrom-Json

    $senderPatterns  = @($params.senderPatterns)
    $dateFrom        = [DateTime]::Parse($params.dateFrom)
    $dateTo          = [DateTime]::Parse($params.dateTo)
    $subjectKeywords = if ($params.subjectKeywords) { @($params.subjectKeywords) } else { @() }
    $outputDir       = $params.outputDir
    $folderPath      = if ($params.folderPath) { $params.folderPath } else { "Inbox" }

    # Ensure output directory exists
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }

    # Connect to Outlook via COM
    $outlook = New-Object -ComObject Outlook.Application
    $namespace = $outlook.GetNamespace("MAPI")

    # Resolve folder — support nested paths like "Inbox/Invoices"
    function Get-OutlookFolder($ns, $path) {
        $parts = $path -split "[/\\]"
        # Start from the default Inbox store
        $folder = $ns.GetDefaultFolder(6)  # 6 = olFolderInbox

        if ($parts[0] -ieq "Inbox" -and $parts.Count -gt 1) {
            # Navigate into subfolders
            for ($i = 1; $i -lt $parts.Count; $i++) {
                $folder = $folder.Folders.Item($parts[$i])
            }
        } elseif ($parts[0] -ine "Inbox") {
            # Try to find the folder by name in the default store
            $root = $ns.DefaultStore.GetRootFolder()
            $folder = $root.Folders.Item($parts[0])
            for ($i = 1; $i -lt $parts.Count; $i++) {
                $folder = $folder.Folders.Item($parts[$i])
            }
        }

        return $folder
    }

    $folder = Get-OutlookFolder $namespace $folderPath

    # Build a DASL filter for date range
    $fromStr = $dateFrom.ToString("MM/dd/yyyy HH:mm")
    $toStr   = $dateTo.ToString("MM/dd/yyyy HH:mm")
    $filter  = "[ReceivedTime] >= '$fromStr' AND [ReceivedTime] <= '$toStr'"

    $items = $folder.Items.Restrict($filter)
    $items.Sort("[ReceivedTime]", $true)

    $results = @()

    foreach ($item in $items) {
        if ($item.Class -ne 43) { continue }  # 43 = olMail

        $senderEmail = ""
        $senderName  = ""
        try {
            $senderEmail = $item.SenderEmailAddress
            $senderName  = $item.SenderName
        } catch { }

        # Check sender patterns
        $senderMatch = $false
        foreach ($pattern in $senderPatterns) {
            $p = $pattern.ToLower()
            if ($senderEmail.ToLower().Contains($p) -or $senderName.ToLower().Contains($p)) {
                $senderMatch = $true
                break
            }
        }
        if (-not $senderMatch) { continue }

        # Check subject keywords (if provided)
        if ($subjectKeywords.Count -gt 0) {
            $subjectMatch = $false
            $subj = $item.Subject.ToLower()
            foreach ($kw in $subjectKeywords) {
                if ($subj.Contains($kw.ToLower())) {
                    $subjectMatch = $true
                    break
                }
            }
            if (-not $subjectMatch) { continue }
        }

        # Extract attachments (PDFs and images)
        $attachments = @()
        if ($item.Attachments.Count -gt 0) {
            foreach ($att in $item.Attachments) {
                $ext = [System.IO.Path]::GetExtension($att.FileName).ToLower()
                $invoiceExtensions = @(".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif")

                if ($invoiceExtensions -contains $ext) {
                    $safeName = $att.FileName -replace '[^\w\.\-]', '_'
                    $savePath = Join-Path $outputDir $safeName

                    # Avoid overwriting — append counter if needed
                    $counter = 1
                    while (Test-Path $savePath) {
                        $base = [System.IO.Path]::GetFileNameWithoutExtension($safeName)
                        $savePath = Join-Path $outputDir "$base`_$counter$ext"
                        $counter++
                    }

                    $att.SaveAsFile($savePath)

                    $contentType = switch ($ext) {
                        ".pdf"  { "application/pdf" }
                        ".png"  { "image/png" }
                        ".jpg"  { "image/jpeg" }
                        ".jpeg" { "image/jpeg" }
                        ".tiff" { "image/tiff" }
                        ".tif"  { "image/tiff" }
                        default { "application/octet-stream" }
                    }

                    $attachments += @{
                        filename    = [System.IO.Path]::GetFileName($savePath)
                        filePath    = $savePath
                        contentType = $contentType
                    }
                }
            }
        }

        $results += @{
            subject     = $item.Subject
            from        = $senderEmail
            senderName  = $senderName
            date        = $item.ReceivedTime.ToString("yyyy-MM-ddTHH:mm:ss")
            attachments = $attachments
        }
    }

    # Return results as JSON
    $output = @{
        success = $true
        count   = $results.Count
        emails  = $results
    }

    $output | ConvertTo-Json -Depth 5 -Compress

} catch {
    $errorOutput = @{
        success = $false
        error   = $_.Exception.Message
    }
    $errorOutput | ConvertTo-Json -Compress
    exit 1
}
