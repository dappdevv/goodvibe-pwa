// Скрипт деплоя DAOPartnerProgram и копирования ABI/адреса для фронта
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Получаем параметры из переменных окружения или задаём по умолчанию
  const founder =
    process.env.DAOPARTNER_FOUNDER ||
    (await hre.ethers.getSigners())[0].address;
  const daoGovernance =
    process.env.DAOPARTNER_GOVERNANCE ||
    (await hre.ethers.getSigners())[1].address;

  // Деплой контракта
  const DAOPartnerProgram = await hre.ethers.getContractFactory(
    "DAOPartnerProgram"
  );
  const daoPartnerProgram = await DAOPartnerProgram.deploy(
    founder,
    daoGovernance
  );
  await daoPartnerProgram.waitForDeployment();
  console.log("DAOPartnerProgram deployed to:", daoPartnerProgram.target);

  // Пути к ABI и адресам
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/DAOPartnerProgram.sol/DAOPartnerProgram.json"
  );
  const abiDest = path.join(
    __dirname,
    "../src/blockchain/abi/DAOPartnerProgram.json"
  );
  const addrDest = path.join(
    __dirname,
    "../src/blockchain/addresses/DAOPartnerProgram.json"
  );

  // Копируем ABI
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
  // Сохраняем адрес
  fs.writeFileSync(
    addrDest,
    JSON.stringify({ address: daoPartnerProgram.target }, null, 2)
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
