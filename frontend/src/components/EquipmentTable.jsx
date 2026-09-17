export default function EquipmentTable({ equipment }) {
  return (
    <table className="eq-table">
      <thead>
        <tr><th>Tag</th><th>Equipment</th><th>Spec</th></tr>
      </thead>
      <tbody>
        {equipment.map((e) => (
          <tr key={e.tag} className={e.changed ? "changed" : ""}>
            <td>{e.tag}</td>
            <td>{e.name} {e.changed && <span className="badge">new</span>}</td>
            <td>{e.spec}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
