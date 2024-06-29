import {expect} from 'chai';
import parse from '#lib/parse';

describe('cacx.parse()', ()=> {

	it('simple inputs #1 ', ()=>
		expect(parse('<a>Value A</a>')).to.deep.equal([
			{tag: 'a', text: 'Value A'},
		])
	);

	it('simple inputs #2 ', ()=>
		expect(parse('<a><b>Value B</b></a>')).to.deep.equal([
			{tag: 'a'},
			{tag: 'b', text: 'Value B'},
		])
	);

	it('simple inputs #3 ', ()=>
		expect(parse('<a><b><c>Value C</c></b></a>')).to.deep.equal([
			{tag: 'a'},
			{tag: 'b'},
			{tag: 'c', text: 'Value C'},
		])
	);

});
