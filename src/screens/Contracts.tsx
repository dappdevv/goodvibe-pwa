import daoUsersAddress from "../blockchain/addresses/DAOUsers.json";

export default function Contracts() {
  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-4">Контракты</h1>
      <div className="bg-muted rounded-lg p-3 mb-4">
        <b>Контракты:</b>
        <div className="text-sm mt-1">
          DAOUsers: <span className="font-mono">{daoUsersAddress.address}</span>
        </div>
      </div>
      <p>Здесь будет информация о смарт-контрактах.</p>
    </div>
  );
}
