export function AdvancedToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={value ? "forge-chip forge-chip--active" : "forge-chip forge-chip--inactive"}
    >
      {value ? "Advanced ON" : "Advanced OFF"}
    </button>
  );
}

export default AdvancedToggle;

