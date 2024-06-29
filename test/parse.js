import {expect} from 'chai';
import parse from '#lib/parse';

describe('cacx.parse()', ()=> {

	it('simple inputs - single tag', ()=>
		expect(parse('<a>Value A</a>')).to.deep.equal({
			tag: 'a',
			text: 'Value A'
		})
	);

	it('simple inputs - two level nested', ()=>
		expect(parse('<a><b>Value B</b></a>')).to.deep.equal({
			tag: 'a',
			children: [{
				tag: 'b',
				text: 'Value B',
			}],
		})
	);

	it('simple inputs - three level nesting', ()=>
		expect(parse('<a><b><c>Value C</c></b></a>')).to.deep.equal({
			tag: 'a',
			children: [{
				tag: 'b',
				children: [{
					tag: 'c',
					text: 'Value C',
				}],
			}],
		})
	);

	it('simple inputs - nesting with prefix / suffix + value', ()=>
		expect(parse('<a>AP:<b>BP:<c>VC</c>BS</b>AS</a>')).to.deep.equal({
			tag: 'a',
			text: 'AP:AS',
			children: [{
				tag: 'b',
				text: 'BP:BS',
				children: [{
					tag: 'c',
					text: 'VC',
				}],
			}],
		})
	)

});
