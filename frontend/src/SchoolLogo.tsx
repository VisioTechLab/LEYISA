import logo from './assets/leyisa-school.jpeg';

export function SchoolLogo({ label = '' }: { label?: string }) {
  return (
    <span className="leyisa-logo">
      <img src={logo} alt={label} width="1600" height="1600" />
    </span>
  );
}
