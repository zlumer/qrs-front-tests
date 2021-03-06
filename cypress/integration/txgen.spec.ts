import { parseHostMessage, IHCSimple } from "../../src/helpers/webrtc/hostproto"
import { reset as resetWebrtc, getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"
import { RequestHandlerTuple } from "../../src/helpers/webrtc/jsonrpc"
import { connectWebrtc } from "./interact_webrtc"
import { checkShownQr, showQrText } from "./interact_qr"

import qrs = require('../fixtures/qrs.json')

describe('tx generation', () =>
{
	function fillTx(address: string, amount: string)
	{
		cy.url().should('include', '/create')
		cy.get('[data-cy=form-to]').type(address)
		cy.get('[data-cy=form-amount]').type(amount)
	}
	function getEthGas()
	{
		return cy.get('[data-cy=total-gas]').then(subj => subj.text())
	}
	function getGasPrice()
	{
		return cy.get('.vue-slider-dot-tooltip-text').then(subj => subj.text())
	}
	function gweiToEth(gwei: string)
	{
		return "" + parseFloat(gwei) * 1000000000
	}
	function checkGasPriceFactory(tag: string = '')
	{
		cy.get('[data-cy=gas-slider]', { timeout: 10000 }).should('exist')
		let total = `gasTotal${tag}`
		let price = `gasPrice${tag}`
		getEthGas().as(total)
		getGasPrice().as(price)
		return {
			total: () => cy.get(`@${total}`).then(x => expect(x).match(/^0\.\d* ETH$/)),
			price: (compare?: string) => cy.get(`@${price}`).then(x =>
			{
				expect(x).match(/^\d+(\.\d+)?$/, `gas price should be a number!`)
				if (typeof compare === 'undefined')
					return
				
				let eth = gweiToEth(x as any as string)
				expect(compare).eq(eth, `gas prices should match! got ${x}, expected ${compare}`)
			}),
		}
	}
	function fillTxEos(address: string, amount: string, memo: string)
	{
		cy.url().should('include', '/create')
		cy.get('[data-cy=form-to]').type(address)
		cy.get('[data-cy=form-amount]').type(amount)
		if (memo)
			cy.get('[data-cy=form-memo]').should('exist').type(memo)
		else
			cy.get('[data-cy=form-memo]').should('exist')
	}
	function newTx()
	{
		showQrText(qrs.login_single_eth_wallet)
		cy.contains(/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i).click()
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		cy.contains(/send eth/i).click()
	}
	function newTxEos()
	{
		showQrText(qrs.login_single_eos_wallet)
		cy.contains(/cryptoman111/i).click()
		cy.get('[data-cy=tx-list]', { timeout: 10000 }).should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		cy.contains(/send eos/i).click()
	}
	it('should open tx creation window', () =>
	{
		cy.visit('/login')

		newTx()

		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345')
		cy.get('[data-cy=form-usd]', { timeout: 10000 }).invoke('val').should('match', /^\d+\.\d*$/)

		cy.contains(/sign/i).click()
	})
	it('should open tx creation window through direct wallet link', () =>
	{
		cy.visit('/wallet/eth/0x036800cca6e1b092f53dde40c30efbd4c59cb3c8?chainId=4')
		cy.contains(/send/i).click()

		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345')
		cy.contains(/sign/i).click()
	})
	it('should open tx creation window through direct txcreate link', () =>
	{
		cy.visit('/wallet/eth/0x036800cca6e1b092f53dde40c30efbd4c59cb3c8/create?chainId=4')

		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345')
		cy.contains(/sign/i).click()
	})
	it('should open eth wallet without chain id', () =>
	{
		cy.visit('/wallet/eth/0x036800cca6e1b092f53dde40c30efbd4c59cb3c8')
		cy.contains(/send/i)
		cy.contains(/eth/i)
		cy.visit('/wallet/eth/0x036800cca6e1b092f53dde40c30efbd4c59cb3c8/create')
		cy.contains(/send eth/i)
		cy.get('[data-cy=form-to]').should('exist')
	})
	it('should open eos wallet without chain id', () =>
	{
		cy.visit('/wallet/eos/cryptoman111')
		cy.contains(/send/i)
		cy.contains(/eos/i)
		cy.visit('/wallet/eos/cryptoman111/create')
		cy.contains(/send eos/i)
		cy.get('[data-cy=form-to]').should('exist')
	})
	it('should fill form with USD values', () =>
	{
		cy.visit('/login')

		newTx()

		cy.get('[data-cy=form-usd]').type('500.5')
		cy.get('[data-cy=form-amount', { timeout: 10000 }).invoke('val').should('match', /^\d+\.\d*$/)
	})
	interface IEthTransaction
	{
		to: string
		value: string
		nonce: number
		gasPrice: string
	}
	interface IEosTransaction
	{
		expiration: string
		ref_block_num: number
		ref_block_prefix: number
		actions: [
			{
				name: string
				account: string
				authorization: [{
					actor: string
					permission: string
				}],
				data: {
					to: string
					from: string
					quantity: string
					memo: string
				}
			}
		]
	}
	interface IWallet
	{
		blockchain: "eth" | "eos"
		address: string
		chainId: string | number
	}
	it('should generate tx request', () =>
	{
		cy.visit('/login')

		newTx()
		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345')
		let gasExpect = checkGasPriceFactory('gen1')
		cy.get('[data-cy=form-usd', { timeout: 10000 }).invoke('val').should('match', /^\d+\.\d*$/)
		cy.contains(/sign/i).click()

		checkShownQr(/^signTransferTx\|\d+\|.+$/).then(qr =>
		{
			let msg = parseHostMessage(qr) as IHCSimple<{ tx: IEthTransaction }, { wallet: IWallet }>
			assert(msg, `host message is not defined`)
			expect(msg.method).eq('signTransferTx')
			assert(msg.params, `host message params are not defined`)
			let [tx, wallet] = Array.isArray(msg.params) ? msg.params : [msg.params.tx, msg.params.wallet]
			
			expect(wallet.address.toLowerCase()).eq('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0'.toLowerCase())
			expect(wallet.blockchain).eq('eth')
			expect(wallet.chainId.toString()).eq('4')
			
			expect(tx.value).eq('45012345000000000000')
			assert.isNumber(tx.nonce)
			expect(tx.to.toLowerCase()).eq(wallet.address.toLowerCase())

			gasExpect.total()
			gasExpect.price(tx.gasPrice)
		})
	})
	it('should not work without form values', () =>
	{
		cy.visit('/login')

		newTx()

		cy.contains(/sign/i).should('be.disabled')
	})
	it('should not work with incorrect eth address', () =>
	{
		cy.visit('/login')

		newTx()

		fillTx('zzz', '0')
		cy.contains(/sign/i).should('be.disabled')
	})
	it('should not work with incorrect eth value', () =>
	{
		cy.visit('/login')

		newTx()

		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', 'uuu')
		cy.contains(/sign/i).should('be.disabled')
	})
	it('short', () =>
	{
		resetWebrtc(false)
		getWebrtc().jrpc.switchToQueueMode()

		cy.visit('/')
		cy.get('[data-cy=login-webrtc]').click()
		cy.url().should('match', /\/login|\/webrtc/)
	})
	it('should generate webrtc tx', () =>
	{
		resetWebrtc(false)
		let webrtc = getWebrtc()
		webrtc.jrpc.switchToQueueMode()
		
		let SIGNED_TX_RESPONSE = '0x1234611325'
		let SIGNED_TX_RESPONSE_HASH = '0xe8dad6daa4da90d0c03308e5d92c61b6a663a13169fa89bdf2f9dd772910196a'

		cy.visit('/', {
			onBeforeLoad: (win) =>
			{
				let f = (win as any).__eth__sendTx = (str: string) =>
				{
					console.log(`CYPRESS: __eth__sendTx("${str}")`)
					expect(str).eq(SIGNED_TX_RESPONSE)
					return { transactionHash: SIGNED_TX_RESPONSE_HASH }
				}
				cy.stub(win, "__eth__sendTx" as keyof typeof win, f).as("ethSendTx")
			}
		})
		cy.get('[data-cy=login-webrtc]').click()
		cy.url().should('match', /\/login|\/webrtc/)

		// console.log('((( 1')
		connectWebrtc().then(walletCb => walletCb(undefined, [
			{address: '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', chainId:4, blockchain:'eth'}
		]))
		// console.log('((( 2')
		// console.log('((( 3')
		
		cy.contains(/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i).click()
		cy.url().should('match', /\/eth\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)
		cy.contains(/send/i).click()
		cy.url().should('match', /\/create/i)
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		// console.log('((( 4')
		// console.log('((( 5')
		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345')
		let gasExpect = checkGasPriceFactory()
		cy.get('[data-cy=form-usd', { timeout: 10000 }).invoke('val').should('match', /^\d+\.\d*$/)
		// console.log('((( 6')
		
		cy.contains(/sign/i).click()
		// console.log('((( 7')
		
		cy.wrap(webrtc.jrpc.nextMessage()).then((tuple) =>
		{
			let [json, cb] = tuple as RequestHandlerTuple<IHCSimple<{tx: IEthTransaction}, { wallet: IWallet }>, string>
			// console.log('((( 8')
			expect(json.method).eq('signTransferTx')
			// console.log('((( 9')
			let [tx, wallet] = Array.isArray(json.params) ? json.params : [json.params.tx, json.params.wallet]
			// console.log('((( 10')
			
			assert.isDefined(tx, 'transaction should be defined')
			assert.isDefined(wallet, 'wallet should be defined')
			
			expect(wallet.address.toLowerCase()).eq('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0'.toLowerCase())
			// console.log('((( 11')
			expect(wallet.blockchain).eq('eth')
			// console.log('((( 12')
			expect(wallet.chainId.toString()).eq('4')
			// console.log('((( 13')

			expect(tx.value).eq('45012345000000000000')
			assert.isNumber(tx.nonce)
			gasExpect.total()
			gasExpect.price(tx.gasPrice)
			expect(tx.to.toLowerCase()).eq(wallet.address.toLowerCase())

			cb(undefined, SIGNED_TX_RESPONSE)
			cy.get("@ethSendTx").should('be.calledWithExactly', SIGNED_TX_RESPONSE)

			cy.url().should('match', /\/pushtx\/eth\/0x\w{64}/)
			cy.url().should('contain', SIGNED_TX_RESPONSE_HASH)
			cy.get('[data-cy=result-hash]').should('exist')
			cy.get('[data-cy=error]').should('not.exist')
		})
	})
	it('should redirect back to wallet after tx push', () =>
	{
		let SIGNED_TX_RESPONSE = '0x1234611325'
		let SIGNED_TX_RESPONSE_HASH = '0xe8dad6daa4da90d0c03308e5d92c61b6a663a13169fa89bdf2f9dd772910196a'

		cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4', {
			onBeforeLoad: (win) =>
			{
				let f = (win as any).__eth__sendTx = (str: string) =>
				{
					console.log(`CYPRESS: __eth__sendTx("${str}")`)
					expect(str).eq(SIGNED_TX_RESPONSE)
					return { transactionHash: SIGNED_TX_RESPONSE_HASH }
				}
				cy.stub(win, "__eth__sendTx" as keyof typeof win, f).as("ethSendTx")
			}
		})
		// fill out the form
		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345')
		// send sign request
		cy.contains(/sign/i).click()

		checkShownQr(/^signTransferTx\|\d+\|.+$/).then(qr =>
		{
			console.log('QRRR: ', qr)
			let msg = parseHostMessage(qr) as IHCSimple<{tx: IEthTransaction}, { wallet: IWallet }>
			expect(msg.method).eq('signTransferTx')

			// show qr code with response
			showQrText(`|${msg.id}|"${SIGNED_TX_RESPONSE}"`)
			
			// wait until fake push method is called (window.__eth__sendTx())
			cy.get("@ethSendTx").should('be.calledWithExactly', SIGNED_TX_RESPONSE)

			// check that the page was redirected
			cy.url().should('match', /\/pushtx\/eth\/0x\w{64}/)
			cy.url().should('contain', SIGNED_TX_RESPONSE_HASH)
			cy.get('[data-cy=result-hash]').should('exist')
			cy.get('[data-cy=error]').should('not.exist')

			// close the window
			cy.get('.cross').click()
			// MAIN CHECK: check that we are still in our wallet
			cy.url().should('match', /\/wallet\/eth\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0\?chainId=4/)
		})
	})
	it('should generate EOS tx request', () =>
	{
		cy.visit('/login')

		newTxEos()
		fillTxEos('cryptoman222', '45.4321', "")
		cy.get('[data-cy=form-usd', { timeout: 10000 }).invoke('val').should('match', /^\d+\.\d*$/)
		cy.contains(/sign/i).click()

		checkShownQr(/^signTransferTx\|\d+\|.+$/).then(qr =>
		{
			console.log('QRRR: ', qr)
			let msg = parseHostMessage(qr) as IHCSimple<{ tx: { transaction: IEosTransaction, method: string } }, { wallet: IWallet }>
			assert(msg, `host message is not defined`)
			expect(msg.method).eq('signTransferTx')
			assert(msg.params, `host message params are not defined`)
			
			let [transaction, wallet] = Array.isArray(msg.params) ? msg.params : [msg.params.tx, msg.params.wallet]
			assert(transaction, `msg.tx should be defined`)
			let { transaction: tx, method: abi } = transaction
			assert(tx, `msg.tx should contain 'transaction' field`)
			assert(abi, `msg.tx should contain 'method' field`)
			
			expect(wallet.address).eq('cryptoman111')
			expect(wallet.blockchain).eq('eos')
			expect(wallet.chainId.toString()).eq('e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473')
			
			expect(abi).eq('transfer(from:name,to:name,quantity:asset,memo:string)')

			assert.isString(tx.expiration, 'expiration should be string (and present)')
			assert.isNumber(tx.ref_block_num, 'ref_block_num should be number (and present)')
			assert.isNumber(tx.ref_block_prefix, 'ref_block_prefix should be number (and present)')
			assert.isArray(tx.actions, 'tx.actions should be array')
			assert.lengthOf(tx.actions, 1, 'tx.actions should have only one element')
			expect(tx.actions[0].account).eq('eosio.token')
			expect(tx.actions[0].name).eq('transfer')
			assert.isArray(tx.actions[0].authorization)
			assert.lengthOf(tx.actions[0].authorization, 1)
			expect(tx.actions[0].authorization[0].actor).eq('cryptoman111')
			expect(tx.actions[0].authorization[0].permission).eq('active')
			expect(tx.actions[0].data).eql({
				from: 'cryptoman111',
				to: 'cryptoman222',
				quantity: '45.4321 EOS',
				memo: ''
			})
		})
	})
	it('should generate eos webrtc tx', () =>
	{
		resetWebrtc(false)
		let webrtc = getWebrtc()
		webrtc.jrpc.switchToQueueMode()
		let eosSendTx: (str: string) => void

		cy.visit('/', {
			onBeforeLoad: (win) =>
			{
				(win as any).__eos__sendTx = (str: string) => eosSendTx(str)
				cy.stub(win as any, "__eos__sendTx").as("eosSendTx")
			}
		})
		cy.get('[data-cy=login-webrtc]').click()
		cy.url().should('match', /\/login|\/webrtc/)

		// console.log('((( 1')
		connectWebrtc().then(walletCb => walletCb(undefined, [
			{
				address: 'cryptoman111',
				chainId: 'e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473',
				blockchain:'eos'
			}
		]))
		// console.log('((( 2')
		// console.log('((( 3')
		
		cy.contains(/cryptoman111/i).click()
		cy.url().should('match', /\/eos\/cryptoman111/i)
		cy.contains(/send/i).click()
		cy.url().should('match', /\/create/i)
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		// console.log('((( 4')
		// console.log('((( 5')

		fillTxEos('cryptoman222', '45.0123', 'hi')
		// console.log('((( 6')
		cy.get('[data-cy=form-usd', { timeout: 10000 }).invoke('val').should('match', /^\d+\.\d*$/)
		
		cy.contains(/sign/i).click()
		// console.log('((( 7')
		
		cy.wrap(webrtc.jrpc.nextMessage()).then(tuple =>
		{
			let [json, cb] = tuple as RequestHandlerTuple<IHCSimple<{ tx: { transaction: IEosTransaction, method: string }}, { wallet: IWallet }>, string>
			
			// console.log('((( 8')
			expect(json.method).eq('signTransferTx')
			// console.log('((( 9')
			// console.log('((( 10')
			
			let [transaction, wallet] = Array.isArray(json.params) ? json.params : [json.params.tx, json.params.wallet]
			assert(transaction, `msg.tx should be defined`)
			let { transaction: tx, method: abi } = transaction
			assert(tx, `msg.tx should contain 'transaction' field`)
			assert(abi, `msg.tx should contain 'method' field`)

			assert.isDefined(tx, 'transaction should be defined')
			assert.isDefined(abi, 'method should be defined!')
			assert.isDefined(wallet, 'wallet should be defined')
			
			expect(wallet.address).eq('cryptoman111'.toLowerCase())
			// console.log('((( 11')
			expect(wallet.blockchain).eq('eos')
			// console.log('((( 12')
			expect(wallet.chainId.toString()).eq('e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473')
			// console.log('((( 13')

			expect(abi).eq('transfer(from:name,to:name,quantity:asset,memo:string)')

			assert.isString(tx.expiration, 'expiration should be string (and present)')
			assert.isNumber(tx.ref_block_num, 'ref_block_num should be number (and present)')
			assert.isNumber(tx.ref_block_prefix, 'ref_block_prefix should be number (and present)')
			assert.isArray(tx.actions, 'tx.actions should be array')
			assert.lengthOf(tx.actions, 1, 'tx.actions should have only one element')
			expect(tx.actions[0].account).eq('eosio.token')
			expect(tx.actions[0].name).eq('transfer')
			assert.isArray(tx.actions[0].authorization)
			assert.lengthOf(tx.actions[0].authorization, 1)
			expect(tx.actions[0].authorization[0].actor).eq('cryptoman111')
			expect(tx.actions[0].authorization[0].permission).eq('active')
			expect(tx.actions[0].data).eql({
				from: 'cryptoman111',
				to: 'cryptoman222',
				quantity: '45.0123 EOS',
				memo: 'hi'
			})

			let stx = "0x1234611325"
			cb(undefined, stx)
			cy.get("@eosSendTx").should('be.calledWithExactly', stx)
		})
	})
	it('should not show erc20 button on eos wallet', () =>
	{
		cy.visit('/wallet/eos/cryptoman111')
		cy.contains(/send/i)
		cy.contains(/erc20/i).should('not.exist')
	})
	it.skip('should load ETH token info on the fly', () =>
	{
		cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/erc20?chainId=4')
		
		cy.get('[data-cy=form-token] input').type('0xf035755df96ad968a7ad52c968dbe86d52927f5b')
		cy.contains(/MAAT/)
		cy.contains(/Your balance\: \d+(\.\d+)? MAAT/i)

		// cy.visit('/wallet/eth/0x32Be343B94f860124dC4fEe278FDCBD38C102D88/erc20?chainId=4')
		// cy.get('[data-cy=form-token] input').type('0xf035755df96ad968a7ad52c968dbe86d52927f5b')
	})
	it('should generate ETH token transfer', () =>
	{
		cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/erc20?chainId=4')

		// cy.contains(/sign/i).should('be.disabled')

		cy.get('[data-cy=form-token] input').type('0xf035755df96ad968a7ad52c968dbe86d52927f5b{enter}')
		cy.contains(/MAAT/)
		cy.contains(/Your balance\: \d+(\.\d+)? MAAT/i)
		// cy.get('[data-cy=form-to]').type('0x0000000000000000000000000000000000000000')
		cy.get('[data-cy=form-to]').type('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		cy.get('[data-cy=form-amount]').type(`0.${'0'.repeat(17)}1`)
		let gasExpect = checkGasPriceFactory()

		cy.contains(/sign/i).click()

		checkShownQr(/^signContractCall\|\d+\|.+$/).then(qr =>
		{
			console.log('QRRR: ', qr)
			let msg = parseHostMessage(qr) as IHCSimple<{ tx: IEthTransaction & {data: string,gasLimit:string} }, { abi: { method: string, args: string[] } }, { wallet: IWallet }>
			assert(msg, `host message should be defined`)
			expect(msg.method).eq('signContractCall')
			assert(msg.params, `host message params should be defined`)
			let [tx, abi, wallet] = Array.isArray(msg.params) ? msg.params : [msg.params.tx, msg.params.abi, msg.params.wallet]
			assert(tx, `tx should be defined`)
			assert(abi, `abi should be defined`)
			let {args, method} = abi
			assert(args, `ETH contract args should be defined`)
			assert(method, `ETH contract abi (method) should be defined`)
			assert(wallet, `wallet should be defined`)
			expect(args).length(2)
			expect(args[0]).eq('0x0000000000000000000000005dcd6e2d92bc4f96f9072a25cc8d4a3a4ad07ba0')
			expect(args[1]).eq('0x0000000000000000000000000000000000000000000000000000000000000001')
			expect(method).eq('transfer(address,uint256)')
			expect(tx.data).eq('0xa9059cbb0000000000000000000000005dcd6e2d92bc4f96f9072a25cc8d4a3a4ad07ba00000000000000000000000000000000000000000000000000000000000000001')
			expect(parseInt(tx.gasLimit)).gte(50000)
			
			gasExpect.total()
			gasExpect.price(tx.gasPrice)
		})
	})
	it.skip('screenshots', () =>
	{
		function visitAll(prefix: string)
		{
			let _ = (filename: string) => cy.screenshot(prefix + filename)
			
			// home
			cy.visit('/')
			_('0010-index')
			cy.visit('/login')
			_('0020-login')
			cy.visit('/webrtc')
			_('0030-webrtc')

			// wallet list
			cy.visit('/login')
			showQrText(qrs.login_single_eth_wallet)
			cy.url().should('include', '/wallets')
			_('0040-wallets')

			// wallet
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0?chainId=4')
			cy.wait(500) // wait until tx list loads
			_('0050-wallet-eth-rinkeby')
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
			cy.wait(500) // wait until tx list loads
			_('0050-wallet-eth-mainnet')
			
			// forms
			cy.contains('send').click()
			_('0060-createtx-eth')
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/erc20')
			// cy.contains('erc20').click()
			_('0060-erc20-eth')
		}
		
		visitAll('normal_')
		cy.viewport(1920, 1080)
		visitAll('fullhd_')
	})
})
