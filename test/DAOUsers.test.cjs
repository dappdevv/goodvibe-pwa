const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOUsers", function () {
  let DAOUsers, daoUsers, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    DAOUsers = await ethers.getContractFactory("DAOUsers");
    daoUsers = await DAOUsers.deploy();
  });

  it("should register founder on deploy", async function () {
    const founder = await daoUsers.founder();
    expect(founder).to.equal(owner.address);
    const user = await daoUsers.users(owner.address);
    expect(user.status).to.equal(2); // Active
  });

  it("should not allow registration without invite", async function () {
    await expect(
      daoUsers.connect(user1).registerUser("test")
    ).to.be.revertedWith("No active invite for caller");
  });

  it("should create invite and register user", async function () {
    await daoUsers.createInvite(user1.address);
    await daoUsers.connect(user1).registerUser("testuser");
    const user = await daoUsers.users(user1.address);
    expect(user.status).to.equal(2); // Active
    expect(user.name).to.equal("testuser");
  });

  it("should not allow duplicate names", async function () {
    await daoUsers.createInvite(user1.address);
    await daoUsers.connect(user1).registerUser("testuser");
    await daoUsers.createInvite(user2.address);
    await expect(
      daoUsers.connect(user2).registerUser("testuser")
    ).to.be.revertedWith("Name already taken");
  });
});
