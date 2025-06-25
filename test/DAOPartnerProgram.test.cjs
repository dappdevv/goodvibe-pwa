const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOPartnerProgram", function () {
  let DAOPartnerProgram, daoPartner, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    DAOPartnerProgram = await ethers.getContractFactory("DAOPartnerProgram");
    daoPartner = await DAOPartnerProgram.deploy(owner.address);
  });

  it("should register founder on deploy", async function () {
    const founder = await daoPartner.founder();
    expect(founder).to.equal(owner.address);
    const partner = await daoPartner.partners(owner.address);
    expect(partner.status).to.equal(1); // Active
  });

  it("should not allow self-referral", async function () {
    await expect(
      daoPartner.connect(user1).register(user1.address)
    ).to.be.revertedWith("Cannot refer yourself");
  });

  it("should set DAO governance and register new partner", async function () {
    await daoPartner.setDAOGovernance(owner.address);
    await daoPartner.connect(user1).register(owner.address);
    const partner = await daoPartner.partners(user1.address);
    expect(partner.status).to.equal(1); // Active
  });
});
