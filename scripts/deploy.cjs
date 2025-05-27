// Скрипт деплоя DAOUsers и копирования ABI/адреса для фронта
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Деплой контракта
  const DAOUsers = await hre.ethers.getContractFactory("DAOUsers");
  const daoUsers = await DAOUsers.deploy();
  console.log("DAOUsers deployed to:", daoUsers.address);

  // Пути к ABI и адресам
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/DAOUsers.sol/DAOUsers.json"
  );
  const abiDest = path.join(__dirname, "../src/blockchain/abi/DAOUsers.json");
  const addrDest = path.join(
    __dirname,
    "../src/blockchain/addresses/DAOUsers.json"
  );

  // Копируем ABI
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
  // Сохраняем адрес
  fs.writeFileSync(
    addrDest,
    JSON.stringify({ address: daoUsers.address }, null, 2)
  );

  console.log("ABI скопирован в:", abiDest);
  console.log("Адрес скопирован в:", addrDest);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
