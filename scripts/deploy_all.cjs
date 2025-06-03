// Скрипт автоматического деплоя DAOPartnerProgram, GoodVPN, DAOServices с передачей адресов между контрактами
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Получаем signers
  const signers = await hre.ethers.getSigners();
  const owner = process.env.DEPLOY_OWNER || signers[0].address;
  const daoGovernance = process.env.DEPLOY_GOVERNANCE || signers[1].address;

  // 1. Деплой DAOPartnerProgram
  const DAOPartnerProgram = await hre.ethers.getContractFactory(
    "DAOPartnerProgram"
  );
  const daoPartnerProgram = await DAOPartnerProgram.deploy(
    owner,
    daoGovernance
  );
  await daoPartnerProgram.waitForDeployment();
  console.log("DAOPartnerProgram deployed to:", daoPartnerProgram.target);

  // 2. Деплой GoodVPN (адреса owner, daoServices (заглушка), daoPartnerProgram)
  // Для daoServices временно передаём owner, потом обновим в контракте, если потребуется
  const GoodVPN = await hre.ethers.getContractFactory("GoodVPN");
  const goodVPN = await GoodVPN.deploy(owner, owner, daoPartnerProgram.target);
  await goodVPN.waitForDeployment();
  console.log("GoodVPN deployed to:", goodVPN.target);

  // 3. Деплой DAOServices (owner, daoGovernance, goodVPN)
  const DAOServices = await hre.ethers.getContractFactory("DAOServices");
  const daoServices = await DAOServices.deploy(
    owner,
    daoGovernance,
    goodVPN.target
  );
  await daoServices.waitForDeployment();
  console.log("DAOServices deployed to:", daoServices.target);

  // Обновляем адрес DAOServices в GoodVPN
  const tx = await goodVPN.setDaoServices(daoServices.target);
  await tx.wait();
  console.log("GoodVPN: daoServices address updated to", daoServices.target);

  // Сохраняем ABI и адреса для фронта
  const saveAbiAndAddress = (contractName, contractInstance) => {
    const artifactPath = path.join(
      __dirname,
      `../artifacts/contracts/${contractName}.sol/${contractName}.json`
    );
    const abiDest = path.join(
      __dirname,
      `../src/blockchain/abi/${contractName}.json`
    );
    const addrDest = path.join(
      __dirname,
      `../src/blockchain/addresses/${contractName}.json`
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
    fs.writeFileSync(
      addrDest,
      JSON.stringify({ address: contractInstance.target }, null, 2)
    );
    console.log(`ABI скопирован в: ${abiDest}`);
    console.log(`Адрес скопирован в: ${addrDest}`);
  };

  saveAbiAndAddress("DAOPartnerProgram", daoPartnerProgram);
  saveAbiAndAddress("GoodVPN", goodVPN);
  saveAbiAndAddress("DAOServices", daoServices);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
