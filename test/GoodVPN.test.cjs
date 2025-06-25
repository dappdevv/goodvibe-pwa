const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoodVPN", function () {
  let GoodVPN, goodVPN, owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    GoodVPN = await ethers.getContractFactory("GoodVPN");
    goodVPN = await GoodVPN.deploy(owner.address, user2.address, user3.address);
  });

  it("should add and remove VPN server", async function () {
    await goodVPN.addServerVPN(
      3600,
      "RU",
      1,
      "Test server",
      ethers.parseEther("0.1")
    );
    const server = await goodVPN.servers(0);
    expect(server.location).to.equal("RU");
    await goodVPN.removeServerVPN(0);
    const removed = await goodVPN.servers(0);
    expect(removed.exists).to.equal(false);
  });

  it("should not allow non-owner to add server", async function () {
    await expect(
      goodVPN
        .connect(user1)
        .addServerVPN(3600, "RU", 1, "Test", ethers.parseEther("0.1"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
