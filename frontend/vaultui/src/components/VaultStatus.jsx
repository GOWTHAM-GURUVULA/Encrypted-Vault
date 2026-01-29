export default function VaultStatus({ isOpen }) {
  return <h3>Vault Status: {isOpen ? "🔓 Open" : "🔒 Closed"}</h3>;
}
