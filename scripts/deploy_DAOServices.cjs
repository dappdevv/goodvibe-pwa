// Скрипт деплоя DAOServices и копирования ABI/адреса для фронта
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Получаем параметры из переменных окружения или задаём по умолчанию
  const owner =
    process.env.DEPLOY_OWNER || (await hre.ethers.getSigners())[0].address;

  // Деплой контракта
  const DAOServices = await hre.ethers.getContractFactory("DAOServices");
  const daoServices = await DAOServices.deploy(owner);
  await daoServices.waitForDeployment();
  console.log("DAOServices deployed to:", daoServices.target);

  // Пути к ABI и адресам
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/DAOServices.sol/DAOServices.json"
  );
  const abiDest = path.join(
    __dirname,
    "../src/blockchain/abi/DAOServices.json"
  );
  const addrDest = path.join(
    __dirname,
    "../src/blockchain/addresses/DAOServices.json"
  );

  // Копируем ABI
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
  // Сохраняем адрес
  fs.writeFileSync(
    addrDest,
    JSON.stringify({ address: daoServices.target }, null, 2)
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
