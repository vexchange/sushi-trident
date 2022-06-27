// @ts-nocheck

import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { expect } from "chai";
import { getBigNumber } from "../utilities";

describe("Router", function () {
  let alice, aliceEncoded, feeTo, weth, usdc, masterDeployer, tridentPoolFactory, router, dai, daiUsdcPool, pool;

  before(async function () {
    [alice, feeTo] = await ethers.getSigners();
    aliceEncoded = ethers.utils.defaultAbiCoder.encode(["address"], [alice.address]);
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Deployer = await ethers.getContractFactory("MasterDeployer");
    const PoolFactory = await ethers.getContractFactory("HybridPoolFactory");
    const SwapRouter = await ethers.getContractFactory("TridentRouter");
    const Pool = await ethers.getContractFactory("HybridPool");
    const nullBento = "0x0000000000000000000000000000000000000001";
    weth = await ERC20.deploy("WETH", "WETH", getBigNumber("10000000"));
    usdc = await ERC20.deploy("USDC", "USDC", getBigNumber("10000000"));
    dai = await ERC20.deploy("DAI", "DAI", getBigNumber("10000000"));

    masterDeployer = await Deployer.deploy(17, feeTo.address, nullBento);
    await masterDeployer.deployed();

    tridentPoolFactory = await PoolFactory.deploy(masterDeployer.address);
    await tridentPoolFactory.deployed();
    router = await SwapRouter.deploy(nullBento, masterDeployer.address, weth.address);
    await router.deployed();
    // Whitelist pool factory in master deployer
    await masterDeployer.addToWhitelist(tridentPoolFactory.address);

    await weth.transfer(alice.address, getBigNumber("1000000"));
    await usdc.transfer(alice.address, getBigNumber("1000000"));
    await dai.transfer(alice.address, getBigNumber("1000000"));

    // Pool deploy data
    let addresses = [weth.address, usdc.address].sort();
    const deployData = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256"],
      [addresses[0], addresses[1], 30, 200000]
    );

    pool = await Pool.attach(
      (
        await (await masterDeployer.deployPool(tridentPoolFactory.address, deployData)).wait()
      ).events[0].args[1]
    );

    addresses = [dai.address, usdc.address].sort();
    const deployData2 = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256"],
      [addresses[0], addresses[1], 30, 200000]
    );
    daiUsdcPool = await Pool.attach(
      (
        await (await masterDeployer.deployPool(tridentPoolFactory.address, deployData2)).wait()
      ).events[0].args[1]
    );

    // Approve allowances
    await weth.approve(pool.address, getBigNumber("10000000"), { from: alice.address });
    await usdc.approve(pool.address, getBigNumber("10000000"), { from: alice.address });
    await dai.approve(daiUsdcPool.address, getBigNumber("10000000"), { from: alice.address });
    await usdc.approve(daiUsdcPool.address, getBigNumber("10000000"), { from: alice.address });
  });
  /**
   * TODO: the following tests are commented out because they depend on the router which depends
   * on BentoBox. They should be imported or re-written in the native forge tests when the factory and stableswap
   * architecture are stable
   */
  // describe("HybridPool", function () {
  //   it("Should add liquidity directly to the pool", async function () {
  //     const amount = BigNumber.from(10).pow(19);
  //     const expectedLiquidity = amount.mul(2).sub(1000);
  //
  //     await weth.transfer(pool.address, amount, { from: alice.address });
  //     await usdc.transfer(pool.address, amount, { from: alice.address });
  //     await expect(pool.mint(aliceEncoded))
  //       .to.emit(pool, "Mint")
  //       .withArgs(alice.address, amount, amount, alice.address, expectedLiquidity);
  //     expect(await pool.totalSupply()).gt(1);
  //     await dai.transfer(daiUsdcPool.address, amount, { from: alice.address });
  //     await usdc.transfer(daiUsdcPool.address, amount, { from: alice.address });
  //     await expect(daiUsdcPool.mint(aliceEncoded))
  //       .to.emit(daiUsdcPool, "Mint")
  //       .withArgs(alice.address, amount, amount, alice.address, expectedLiquidity);
  //   });
  // it("Should add liquidity", async function () {
  //   let initialTotalSupply = await pool.totalSupply();
  //   let initialPoolWethBalance = await weth.balanceOf(pool.address);
  //   let initialPoolUsdcBalance = await usdc.balanceOf(pool.address);
  //   let liquidityInput = [
  //     {
  //       token: weth.address,
  //       native: false,
  //       amount: BigNumber.from(10).pow(18),
  //     },
  //     {
  //       token: usdc.address,
  //       native: false,
  //       amount: BigNumber.from(10).pow(18),
  //     },
  //   ];
  //   let addLiquidityPromise = router.addLiquidity(liquidityInput, pool.address, 1, aliceEncoded);
  //   let expectedLiquidity = BigNumber.from(10).pow(18).mul(2);
  //   await expect(addLiquidityPromise)
  //     .to.emit(pool, "Mint")
  //     .withArgs(router.address, liquidityInput[0].amount, liquidityInput[1].amount, alice.address, expectedLiquidity);
  //   let intermediateTotalSupply = await pool.totalSupply();
  //   let intermediatePoolWethBalance = await weth.balanceOf(pool.address);
  //   let intermediatePoolUsdcBalance = await usdc.balanceOf(pool.address);
  //
  //   expect(intermediateTotalSupply).gt(initialTotalSupply);
  //   expect(intermediatePoolWethBalance).eq(initialPoolWethBalance.add(BigNumber.from(10).pow(18)));
  //   expect(intermediatePoolUsdcBalance).eq(initialPoolUsdcBalance.add(BigNumber.from(10).pow(18)));
  //   expect(intermediatePoolWethBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)).eq(
  //     initialPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //   expect(intermediatePoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)).eq(
  //     initialPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //   liquidityInput = [
  //     {
  //       token: weth.address,
  //       native: false,
  //       amount: BigNumber.from(10).pow(17),
  //     },
  //     {
  //       token: usdc.address,
  //       native: false,
  //       amount: BigNumber.from(10).pow(18),
  //     },
  //   ];
  //   addLiquidityPromise = router.addLiquidity(liquidityInput, pool.address, 1, aliceEncoded);
  //   await expect(addLiquidityPromise).to.emit(pool, "Mint");
  //
  //   let finalTotalSupply = await pool.totalSupply();
  //   let finalPoolWethBalance = await weth.balanceOf(pool.address);
  //   let finalPoolUsdcBalance = await usdc.balanceOf(pool.address);
  //
  //   expect(finalTotalSupply).gt(intermediateTotalSupply);
  //   expect(finalPoolWethBalance).eq(intermediatePoolWethBalance.add(BigNumber.from(10).pow(17)));
  //   expect(finalPoolUsdcBalance).eq(intermediatePoolUsdcBalance.add(BigNumber.from(10).pow(18)));
  //   expect(finalPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).lt(
  //     initialPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //   expect(finalPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).lt(
  //     intermediatePoolWethBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)
  //   );
  //   expect(finalPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).gt(
  //     initialPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //   expect(finalPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).gt(
  //     intermediatePoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)
  //   );
  // });
  //
  // it("Should add one sided liquidity", async function () {
  //   let initialTotalSupply = await pool.totalSupply();
  //   let initialPoolWethBalance = await bento.balanceOf(weth.address, pool.address);
  //   let initialPoolUsdcBalance = await bento.balanceOf(usdc.address, pool.address);
  //
  //   let liquidityInputOptimal = [
  //     {
  //       token: weth.address,
  //       native: false,
  //       amount: BigNumber.from(10).pow(18),
  //     },
  //   ];
  //
  //   let addLiquidityPromise = router.addLiquidity(liquidityInputOptimal, pool.address, 1, aliceEncoded);
  //   await router.addLiquidity(liquidityInputOptimal, pool.address, 1, aliceEncoded);
  //
  //   await expect(addLiquidityPromise).to.emit(pool, "Mint");
  //
  //   let intermediateTotalSupply = await pool.totalSupply();
  //   let intermediatePoolWethBalance = await bento.balanceOf(weth.address, pool.address);
  //   let intermediatePoolUsdcBalance = await bento.balanceOf(usdc.address, pool.address);
  //
  //   expect(intermediateTotalSupply).gt(initialTotalSupply);
  //   expect(intermediatePoolWethBalance).gt(initialPoolWethBalance);
  //   expect(intermediatePoolUsdcBalance).eq(initialPoolUsdcBalance);
  //   expect(intermediatePoolWethBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)).gt(
  //     initialPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //
  //   liquidityInputOptimal = [
  //     {
  //       token: usdc.address,
  //       native: false,
  //       amount: BigNumber.from(10).pow(18),
  //     },
  //   ];
  //
  //   addLiquidityPromise = router.addLiquidity(liquidityInputOptimal, pool.address, 1, aliceEncoded);
  //   await expect(addLiquidityPromise).to.emit(pool, "Mint");
  //
  //   let finalTotalSupply = await pool.totalSupply();
  //   let finalPoolWethBalance = await bento.balanceOf(weth.address, pool.address);
  //   let finalPoolUsdcBalance = await bento.balanceOf(usdc.address, pool.address);
  //
  //   expect(finalTotalSupply).gt(intermediateTotalSupply);
  //   expect(finalPoolWethBalance).eq(intermediatePoolWethBalance);
  //   expect(finalPoolUsdcBalance).gt(intermediatePoolUsdcBalance);
  //   expect(finalPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).gt(
  //     initialPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //   expect(finalPoolWethBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).lt(
  //     intermediatePoolWethBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)
  //   );
  //   expect(finalPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).lt(
  //     initialPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(initialTotalSupply)
  //   );
  //   expect(finalPoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(finalTotalSupply)).gt(
  //     intermediatePoolUsdcBalance.mul(BigNumber.from(10).pow(36)).div(intermediateTotalSupply)
  //   );
  // });

  // it("Should swap some tokens", async function () {
  //   let amountIn = BigNumber.from(10).pow(18);
  //   let expectedAmountOut = await pool.getAmountOut(encodedTokenAmount(weth, amountIn));
  //   expect(expectedAmountOut).gt(1);
  //   let params = swapParams(weth.address, amountIn, pool.address, alice.address, 1);
  //   let oldAliceWethBalance = await weth.balanceOf(alice.address);
  //   let oldAliceUsdcBalance = await usdc.balanceOf(alice.address);
  //   let oldPoolWethBalance = await weth.balanceOf(pool.address);
  //   let oldPoolUsdcBalance = await weth.balanceOf(pool.address);
  //   await router.exactInputSingle(params);
  //   expect(await bento.balanceOf(weth.address, alice.address)).eq(oldAliceWethBalance.sub(amountIn));
  //   expect(await bento.balanceOf(usdc.address, alice.address)).eq(oldAliceUsdcBalance.add(expectedAmountOut));
  //   expect(await bento.balanceOf(weth.address, pool.address)).gt(oldPoolWethBalance);
  //   expect(await bento.balanceOf(usdc.address, pool.address)).eq(oldPoolUsdcBalance.sub(expectedAmountOut));
  //
  //   amountIn = expectedAmountOut;
  //   expectedAmountOut = await pool.getAmountOut(encodedTokenAmount(usdc, amountIn));
  //   expect(expectedAmountOut).lt(BigNumber.from(10).pow(18));
  //   expect(expectedAmountOut).gt(1);
  //
  //   params = swapParams(usdc.address, amountIn, pool.address, alice.address, 1);
  //
  //   await router.exactInputSingle(params);
  //   expect(await bento.balanceOf(weth.address, alice.address)).lt(oldAliceWethBalance);
  //   expect(await bento.balanceOf(usdc.address, alice.address)).eq(oldAliceUsdcBalance);
  //   expect(await bento.balanceOf(weth.address, pool.address)).gt(oldPoolWethBalance);
  //   expect(await bento.balanceOf(usdc.address, pool.address)).eq(oldPoolUsdcBalance);
  // });
  //
  // it("Should handle multi hop swaps", async function () {
  //   let amountIn = BigNumber.from(10).pow(18);
  //   let expectedAmountOutSingleHop = await pool.getAmountOut(encodedTokenAmount(weth, amountIn));
  //   expect(expectedAmountOutSingleHop).gt(1);
  //   let params = {
  //     tokenIn: weth.address,
  //     amountIn: amountIn,
  //     amountOutMinimum: 1,
  //     path: [
  //       {
  //         pool: pool.address,
  //         data: encodedSwapData(weth.address, daiUsdcPool.address),
  //       },
  //       {
  //         pool: daiUsdcPool.address,
  //         data: encodedSwapData(usdc.address, alice.address),
  //       },
  //     ],
  //   };
  //
  //   let oldAliceWethBalance = await bento.balanceOf(weth.address, alice.address);
  //   let oldAliceUsdcBalance = await bento.balanceOf(usdc.address, alice.address);
  //   let oldAliceDaiBalance = await bento.balanceOf(dai.address, alice.address);
  //   await router.exactInput(params);
  //   expect(await bento.balanceOf(weth.address, alice.address)).eq(oldAliceWethBalance.sub(amountIn));
  //   expect(await bento.balanceOf(usdc.address, alice.address)).eq(oldAliceUsdcBalance);
  //   expect(await bento.balanceOf(dai.address, alice.address)).gt(oldAliceDaiBalance);
  // });

  // it("Should swap some native tokens", async function () {
  //   let amountIn = BigNumber.from(10).pow(18);
  //   let expectedAmountOut = await pool.getAmountOut(encodedTokenAmount(weth, amountIn));
  //   expect(expectedAmountOut).gt(1);
  //   let params = swapParams(weth.address, amountIn, pool.address, alice.address, 1);
  //
  //   let oldAliceWethBalance = await weth.balanceOf(alice.address);
  //   let oldAliceUsdcBalance = await bento.balanceOf(usdc.address, alice.address);
  //   let oldPoolWethBalance = await bento.balanceOf(weth.address, pool.address);
  //   let oldPoolUsdcBalance = await bento.balanceOf(usdc.address, pool.address);
  //   let oldAliceBentoWethBalance = await bento.balanceOf(weth.address, alice.address);
  //
  //   await router.exactInputSingleWithNativeToken(params);
  //
  //   expect(await weth.balanceOf(alice.address)).eq(oldAliceWethBalance.sub(amountIn));
  //   expect(await bento.balanceOf(usdc.address, alice.address)).eq(oldAliceUsdcBalance.add(expectedAmountOut));
  //   expect(await bento.balanceOf(weth.address, pool.address)).gt(oldPoolWethBalance);
  //   expect(await bento.balanceOf(usdc.address, pool.address)).eq(oldPoolUsdcBalance.sub(expectedAmountOut));
  //   expect(await bento.balanceOf(weth.address, alice.address)).eq(oldAliceBentoWethBalance);
  //
  //   amountIn = expectedAmountOut;
  //   expectedAmountOut = await pool.getAmountOut(encodedTokenAmount(usdc, amountIn));
  //   expect(expectedAmountOut).lt(BigNumber.from(10).pow(18));
  //   params = swapParams(usdc.address, amountIn, pool.address, alice.address, 1);
  //
  //   await router.exactInputSingleWithNativeToken(params);
  //   expect(await bento.balanceOf(weth.address, pool.address)).gt(oldPoolWethBalance);
  // });
  // });
});

function encodedTokenAmount(token, amount) {
  return ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [token.address, amount]);
}

function swapParams(tokenIn, amountIn, pool, to, amountOutMinimum) {
  return {
    amountIn: amountIn,
    amountOutMinimum: amountOutMinimum,
    pool: pool,
    tokenIn: tokenIn,
    data: encodedSwapData(tokenIn, to),
  };
}

function encodedSwapData(tokenIn, to) {
  return ethers.utils.defaultAbiCoder.encode(["address", "address"], [tokenIn, to]);
}
