import { parseHostMessage, IHCSimple } from "../../src/helpers/webrtc/hostproto"
import { reset as resetWebrtc, getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"
import { RequestHandlerTuple } from "../../src/helpers/webrtc/jsonrpc"
import { connectWebrtc } from "./interact_webrtc"
import { checkShownQr, showQrText } from "./interact_qr"

import qrs = require('../fixtures/qrs.json')

describe('tx generation', () =>
{
	function fillTx(address: string, amount: string, gas: string)
	{
		cy.url().should('include', '/create')
		cy.get('[data-cy=form-to]').type(address)
		cy.get('[data-cy=form-amount]').type(amount)
		cy.get('[data-cy=form-gas]').type(gas)
	}
	function fillTxEos(address: string, amount: string, memo: string)
	{
		cy.url().should('include', '/create')
		cy.get('[data-cy=form-to]').type(address)
		cy.get('[data-cy=form-amount]').type(amount)
		cy.get('[data-cy=form-memo]').should('exist').type(memo)
	}
	function newTx()
	{
		showQrText(qrs.login_single_eth_wallet)
		cy.contains(/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i).click()
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		cy.contains(/tx/i).click()
	}
	it('should open tx creation window', () =>
	{
		cy.visit('/login')

		newTx()

		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345', '3')

		cy.contains(/sign/i).click()
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
		to: string
		value: string
		memo: string
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
		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345', "73.1")
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
			expect(tx.gasPrice).match(/^73100000000$/)
			expect(tx.to.toLowerCase()).eq(wallet.address.toLowerCase())
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

		fillTx('zzz', '0', '0')
		cy.contains(/sign/i).should('be.disabled')
	})
	it('should not work with incorrect eth value', () =>
	{
		cy.visit('/login')

		newTx()

		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', 'uuu', '2')
		cy.contains(/sign/i).should('be.disabled')
	})
	it('short', () =>
	{
		resetWebrtc(false)
		getWebrtc().jrpc.switchToQueueMode()

		cy.visit('/')
		cy.contains(/WebRTC/i).click()
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
		cy.contains(/WebRTC/i).click()
		cy.url().should('match', /\/login|\/webrtc/)

		// console.log('((( 1')
		connectWebrtc().then(walletCb => walletCb(undefined, [
			{address: '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', chainId:4, blockchain:'eth'}
		]))
		// console.log('((( 2')
		// console.log('((( 3')
		
		cy.contains(/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i).click()
		cy.url().should('match', /\/eth\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)
		cy.contains(/tx/i).click()
		cy.url().should('match', /\/create/i)
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		// console.log('((( 4')
		// console.log('((( 5')
		fillTx('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', '45.012345', '4')
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
			
			expect(wallet.address.toLowerCase()).eq('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0'.toLowerCase())
			// console.log('((( 11')
			expect(wallet.blockchain).eq('eth')
			// console.log('((( 12')
			expect(wallet.chainId.toString()).eq('4')
			// console.log('((( 13')

			expect(tx.value).eq('45012345000000000000')
			assert.isNumber(tx.nonce)
			expect(tx.gasPrice).match(/^4000000000$/)
			expect(tx.to.toLowerCase()).eq(wallet.address.toLowerCase())

			cb(undefined, SIGNED_TX_RESPONSE)
			cy.get("@ethSendTx").should('be.calledWithExactly', SIGNED_TX_RESPONSE)

			cy.url().should('match', /\/pushtx\/eth\/0x\w{64}/)
			cy.url().should('contain', SIGNED_TX_RESPONSE_HASH)
			cy.get('[data-cy=result-hash]').should('exist')
			cy.get('[data-cy=error]').should('not.exist')
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
		cy.contains(/WebRTC/i).click()
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
		cy.contains(/tx/i).click()
		cy.url().should('match', /\/create/i)
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		// console.log('((( 4')
		// console.log('((( 5')

		fillTxEos('cryptoman222', '45.0123', 'hi')
		// console.log('((( 6')
		
		cy.contains(/sign/i).click()
		// console.log('((( 7')
		
		cy.wrap(webrtc.jrpc.nextMessage()).then(tuple =>
		{
			let [json, cb] = tuple as RequestHandlerTuple<IHCSimple<{tx: IEthTransaction}, { wallet: IWallet }>, string>
			
			// console.log('((( 8')
			expect(json.method).eq('signTransferTx')
			// console.log('((( 9')
			let [tx, wallet] = Array.isArray(json.params) ? json.params : [json.params.tx, json.params.wallet]
			// console.log('((( 10')
			
			expect(wallet.address.toLowerCase()).eq('cryptoman111'.toLowerCase())
			// console.log('((( 11')
			expect(wallet.blockchain).eq('eth')
			// console.log('((( 12')
			expect(wallet.chainId.toString()).eq('4')
			// console.log('((( 13')

			expect(tx.value).eq('45012345000000000000')
			assert.isNumber(tx.nonce)
			expect(tx.nonce).gte(0)
			expect(tx.gasPrice).match(/^4000000000$/)
			expect(tx.to.toLowerCase()).eq(wallet.address.toLowerCase())

			let stx = "0x1234611325"
			cb(undefined, stx)
			cy.wait("@eosSendTx").should('be.calledWithExactly', stx)
		})
	})
})
