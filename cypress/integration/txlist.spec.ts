import { showQrText } from "./interact_qr"

import qrs = require('../fixtures/qrs.json')

describe('tx lists', () =>
{
	it('should show tx list on an eth wallet via direct link', () =>
	{
		cy.visit('/wallet/eth/0x036800cca6e1b092f53dde40c30efbd4c59cb3c8?chainId=4')
		cy.get('[data-cy=tx-list]').should('exist')
	})
	it('should show tx list on multiple eth wallets', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-qr]').click()
		
		showQrText(qrs.login_multiple_eth_wallets)

		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		cy.contains('0x30384424F1Ab508F1f82b58f1335f343ABdF68AE')
		cy.contains('0x1AD80eC32FD6Ef24e80801e90C5f7e32950C2D05')
		cy.get('[data-cy=tx-list]').should('exist')
		cy.contains('0x30384424F1Ab508F1f82b58f1335f343ABdF68AE').click()
		cy.get('[data-cy=tx-list-empty]').should('exist')
		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0').click()
		cy.get('[data-cy=tx-list]').should('exist')
	})
})