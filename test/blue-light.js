import {expect} from 'chai';
import parseFile from '#lib/parseFile';
import parseCollectionFile from '#lib/parseCollectionFile';

describe('cacx.parse() + blue-light.xml', ()=> {

	it('parse blue-light XML', async ()=> {
		let value = await parseFile('./test/data/blue-light.xml');

		expect(value).to.have.property('tag', 'xml');
		expect(value).to.have.nested.property('children[0].children');

		// Dig into the <record> tags
		value = value.children[0].children;
		expect(value).to.be.an('array');

		value.forEach(record => {
			expect(record).to.have.property('tag', 'record');
		});
	});

	it('flatten blue-light XML', async ()=> {
		let value = await parseFile('./test/data/blue-light.xml', {
			flatten: true,
		});
		expect(value).to.have.nested.property('xml.records');
		expect(value.xml.records).to.be.an('array');
	});

	it.only('parse blue-light XML as a collection', async ()=> {
		let refs = [];

		await parseCollectionFile(
			'./test/data/blue-light.xml',
			{
				record(ref) {
					console.log('REF!', {ref});
					refs.push(ref);
				},
			},
			{
				flatten: true,
			},
		);

		expect(refs).to.have.length.above(0);
	});

});
