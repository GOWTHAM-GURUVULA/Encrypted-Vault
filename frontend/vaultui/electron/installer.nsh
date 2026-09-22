!macro customUnInstall
  RMDir /r "$APPDATA\encrypted-secure-vault"
  RMDir /r "$APPDATA\encrypted-vault"
  RMDir /r "$APPDATA\EncryptedVault"
  RMDir /r "$LOCALAPPDATA\encrypted-secure-vault"
  RMDir /r "$LOCALAPPDATA\encrypted-vault"
  RMDir /r "$LOCALAPPDATA\EncryptedVault"
!macroend
