param(
    [string]$ReleaseDir = (Join-Path $PSScriptRoot "..\\release"),
    [string]$SignToolPath = $env:TRUSTED_SIGNING_SIGNTOOL_PATH,
    [string]$DlibPath = $env:TRUSTED_SIGNING_DLIB_PATH,
    [string]$MetadataPath = $env:TRUSTED_SIGNING_METADATA_PATH,
    [string]$TimestampUrl = $(if ($env:TRUSTED_SIGNING_TIMESTAMP_URL) { $env:TRUSTED_SIGNING_TIMESTAMP_URL } else { "http://timestamp.acs.microsoft.com" })
)

$ErrorActionPreference = "Stop"

function Assert-FileExists {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
        throw "$Label not found: $Path"
    }
}

function Sign-Artifact {
    param(
        [string]$FilePath,
        [string]$SignToolPath,
        [string]$DlibPath,
        [string]$MetadataPath,
        [string]$TimestampUrl
    )

    Write-Host "Signing $FilePath"
    & $SignToolPath sign `
        /v `
        /fd SHA256 `
        /td SHA256 `
        /tr $TimestampUrl `
        /dlib $DlibPath `
        /dmdf $MetadataPath `
        $FilePath

    if ($LASTEXITCODE -ne 0) {
        throw "SignTool failed for $FilePath"
    }
}

Assert-FileExists -Path $SignToolPath -Label "SignTool"
Assert-FileExists -Path $DlibPath -Label "Trusted Signing dlib"
Assert-FileExists -Path $MetadataPath -Label "Trusted Signing metadata file"
Assert-FileExists -Path $ReleaseDir -Label "Release directory"

$releaseRoot = (Resolve-Path -LiteralPath $ReleaseDir).Path
$installer = Get-ChildItem -LiteralPath $releaseRoot -Filter "Encrypted Vault Setup *.exe" |
    Where-Object { $_.Name -notlike "*__uninstaller*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    throw "No installer found in $releaseRoot"
}

$artifacts = @($installer.FullName)

$appExe = Join-Path $releaseRoot "win-unpacked\\Encrypted Vault.exe"
if (Test-Path -LiteralPath $appExe) {
    $artifacts += $appExe
}

foreach ($artifact in $artifacts) {
    Sign-Artifact `
        -FilePath $artifact `
        -SignToolPath $SignToolPath `
        -DlibPath $DlibPath `
        -MetadataPath $MetadataPath `
        -TimestampUrl $TimestampUrl
}

Write-Host "Trusted Signing completed for:"
$artifacts | ForEach-Object { Write-Host " - $_" }
