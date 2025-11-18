// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./TransferHelper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
//import "hardhat/console.sol";

contract EthStaking is Ownable,ReentrancyGuard{
    uint256 public totalStaked;
    uint256 public lockingTime;
    bool public stake_paused;

    struct StakeInfo{
        uint256 start;//start unix time of staking
        uint256 end;//end unix time of staking
        uint256 eth;//staked eth balance
        bool unstaked;
    }
    //mapping form user->list
    mapping( address => StakeInfo[] ) private staking;
    mapping(address => uint256) public userTotalStaked;

    event Staked(address user,uint256 amount);
    event Unstaked(address user,uint256 amount);

    constructor() Ownable(msg.sender){
        lockingTime=10 seconds;//modify this when deployed
        stake_paused=true;
    }

    function enable_stake()external onlyOwner{
        stake_paused=false;
    }
    function disable_stake()external onlyOwner{
        stake_paused=true;
    }
    modifier check_stake(){
        require(!stake_paused,"stake not allowed now");
        _;
    }

    function stake()external payable check_stake{
        address user=msg.sender;
        uint256 value=msg.value;
        //save stake info to staking map
        StakeInfo memory info=StakeInfo(
            {
                start: block.timestamp,
                end: block.timestamp + lockingTime,
                eth: value,
                unstaked:false
            }
        );
        staking[user].push(info);
        //calc user's total staked ether
        userTotalStaked[user]+=value;
        totalStaked+=value;
        emit Staked(user,value);
    }
    function unStake()external {
        address user=msg.sender;
        uint256 value=getAvailableStakeBalance(user);
        require(value>0,"nothing to unstake");
        deleteUnstaked(user);

        TransferHelper.safeTransferETH(user,value);
        userTotalStaked[user]-=value;
        totalStaked-=value;
        emit Unstaked(user,value);
    }
    function deleteUnstaked(address user)internal {
        for (uint256 i=0;i<staking[user].length;i++){
            if(staking[user][i].end<=block.timestamp){
                staking[user][i].unstaked=true;
            }
        }
    }
    function getAvailableStakeBalance(address user) public view returns(uint256) {
        uint256 total;
        for (uint256 i=0;i<staking[user].length;i++){
            if(staking[user][i].end<=block.timestamp&&!staking[user][i].unstaked){
                total+=staking[user][i].eth;
            }
        }
        return total;
    }

    function getAccumulatedPoint(address user ) public view returns(uint256) {
        //TODO:the logic of the points
        return 100;
    }
    //send ether to this contract directly not allowed
    receive() external payable {revert("DO NOT SEND ETH TO THIS CONTRACT DIRECTLY!");}

    //TODO:set emergency mode to let the user exit freely,this switch is only set by owner
    //TODO:withdraw unexpected erc20 tokens and ethers that send to this contract;only owner has permissions to do this
}
