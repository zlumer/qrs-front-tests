describe('payment links', () =>
{
	const regexNumber = /^\d+(\.\d+)?$/
	const form = (name: string) => cy.get(`[data-cy=form-${name}]`)
	describe('should open payment form in ETH', () =>
	{
		it('with amount', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-amount=1.2345')
			form('amount').should('have.value', '1.2345')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '')
		})
		it('with usd', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-usd=1.2345')
			form('usd').should('have.value', '1.2345')
			form('amount').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '')
		})
		it('with address', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-to=0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
			form('amount').should('have.value', '')
			form('usd').should('have.value', '')
			form('to').should('have.value', '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		})
		it('with amount & usd (ignores usd)', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-usd=1&form-amount=1.2345')
			form('amount').should('have.value', '1.2345')
			form('usd').invoke('val').should('match', regexNumber).should('not.eq', '1')
			form('to').should('have.value', '')
		})
		it('with amount & address', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-to=0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0&form-amount=543.21')
			form('amount').should('have.value', '543.21')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		})
	})
	describe('should open payment form in EOS', () =>
	{
		it('with amount', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-amount=25.1234')
			form('amount').should('have.value', '25.1234')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '')
			form('memo').should('have.value', '')
		})
		it('with usd', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-usd=1.23')
			form('amount').invoke('val').should('match', regexNumber)
			form('usd').should('have.value', '1.23')
			form('to').should('have.value', '')
			form('memo').should('have.value', '')
		})
		it('with address', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-to=cryptoman222')
			form('amount').should('have.value', '')
			form('usd').should('have.value', '')
			form('to').should('have.value', 'cryptoman222')
			form('memo').should('have.value', '')
		})
		it('with memo', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-memo=hello%20world')
			form('amount').should('have.value', '')
			form('usd').should('have.value', '')
			form('to').should('have.value', '')
			form('memo').should('have.value', 'hello world')
		})
		it('with amount & usd (ignores usd)', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-amount=25.1234&form-usd=1')
			form('amount').should('have.value', '25.1234')
			form('usd').invoke('val').should('match', regexNumber).should('not.eq', '1')
			form('to').should('have.value', '')
			form('memo').should('have.value', '')
		})
		it('with amount & address & memo', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-amount=25.1234&form-memo=hello%20world&form-to=cryptoman222')
			form('amount').should('have.value', '25.1234')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', 'cryptoman222')
			form('memo').should('have.value', 'hello world')
		})
	})
})