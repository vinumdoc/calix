import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import puppeteer from 'puppeteer';

export const POST: RequestHandler = async ({ request }) => {
	const { html, title } = await request.json();

	if (!html) {
		throw error(400, 'No HTML content provided');
	}

	let browser;
	try {
		browser = await puppeteer.launch({
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu'
			]
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 1280, height: 800 });
		await page.setContent(html, { waitUntil: 'domcontentloaded' });

		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
		});

		const filename = encodeURIComponent(title || 'document');

		return new Response(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}.pdf"`,
				'Content-Length': pdfBuffer.length.toString()
			}
		});
	} catch (err) {
		console.error('Puppeteer PDF Generation Error:', err);
		throw error(500, 'Failed to generate PDF');
	} finally {
		if (browser) {
			await browser.close();
		}
	}
};
