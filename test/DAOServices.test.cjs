const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOServices", function () {
  let DAOServices, daoServices, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    DAOServices = await ethers.getContractFactory("DAOServices");
    daoServices = await DAOServices.deploy(owner.address, user2.address);
  });

  it("should add and remove service", async function () {
    await daoServices.addService("TestService", user1.address);
    const service = await daoServices.services(1);
    expect(service.name).to.equal("TestService");
    await daoServices.removeService(1);
    const removed = await daoServices.services(1);
    expect(removed.exists).to.equal(false);
  });

  it("should add and remove commission", async function () {
    await daoServices.addCommission("TestCommission", 15);
    const commission = await daoServices.commissions(1);
    expect(commission.name).to.equal("TestCommission");
    await daoServices.removeCommission(1);
    const removed = await daoServices.commissions(1);
    expect(removed.exists).to.equal(false);
  });
});
