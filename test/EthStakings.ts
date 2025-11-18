import {network} from "hardhat";
import {EthStaking} from "../types/ethers-contracts/index.js";
// @ts-ignore
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/dist/src/internal/signers/signers.js";
import assert from "node:assert";
import {expect} from "chai";
import {toBigInt} from "ethers";


const { ethers,networkHelpers } = await network.connect();

async function mineBlock(seconds:number){
    // advance time and mine a new block
    // @ts-ignore
    await networkHelpers.time.increase(3600*seconds);
    // @ts-ignore
    await networkHelpers.mine();
}

describe("EthStaking", function () {
     let staking:EthStaking;
     let owner:SignerWithAddress,user1:SignerWithAddress,user2:SignerWithAddress;
    beforeEach(async () => {
        staking = await ethers.deployContract("EthStaking");
        [owner,user1,user2] = await ethers.getSigners();
        // console.log(user1.address, user2.address);
    })
    it("test enable/disable switch", async function () {
        await staking.enable_stake();
        let stake_paused=await staking.stake_paused();
        console.log("stake status:",stake_paused);
        assert.equal(stake_paused,false,"enable stake failed");

        await staking.disable_stake();
        stake_paused=await staking.stake_paused();
        console.log("stake status:",stake_paused);
        assert.equal(stake_paused,true,"disable stake failed");

        let err = ""
        await staking.connect(user1).enable_stake().catch(er => err = er);
        // console.log(err)
        expect(err.toString()).to.contains("OwnableUnauthorizedAccount", "only owner permission")
    })
    it("test stake/unstake", async function () {
        await staking.enable_stake();

        const bal =await ethers.provider.getBalance(user1.address);
        console.log("balance:",bal);
        await staking.connect(user1).stake({value:ethers.parseEther("1.1")});
        await staking.connect(user2).stake({value:ethers.parseEther("1.3")});


        await mineBlock(20);
        let available=await staking.getAvailableStakeBalance(user1.address);
        console.log("available balance:",available);
        let staked=await staking.userTotalStaked(user1.address);
        console.log("staked balance:",staked);
        let total=await staking.totalStaked();
        console.log("total staked:",total);
        expect(available).to.eq(toBigInt(1100000000000000000n));
        expect(available).to.eq(staked);
        expect(total).to.eq(toBigInt(2400000000000000000n));

        //unstaking user1
        await staking.connect(user1).unStake();
        available=await staking.getAvailableStakeBalance(user1.address);
        console.log("user1 balance after unstake:",available);
        staked=await staking.userTotalStaked(user1.address);
        console.log("user1 staked balance after unstaked:",staked);
        total=await staking.totalStaked();
        console.log("total staked after user1 unstake:",total);
        expect(available).to.eq(toBigInt(0));
        expect(available).to.eq(staked);
        expect(total).to.eq(toBigInt(1300000000000000000n));

        //unstaking user2
        await staking.connect(user2).unStake();
        total=await staking.totalStaked();
        console.log("total staked after user2 unstake:",total);
        expect(total).to.eq(toBigInt(0));
    })
    it("test accept ether not allowed", async function () {
        let err = ""
        await user1.sendTransaction({to:await staking.getAddress(),value:ethers.parseEther("0.1")}).catch((er: string) => err = er);
        expect(err.toString()).to.contains("'DO NOT SEND ETH TO THIS CONTRACT DIRECTLY", "send ether check error");
    })
})