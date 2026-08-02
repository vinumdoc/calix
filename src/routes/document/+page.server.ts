import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import puppeteer from 'puppeteer';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		console.log("hit it")
		const formData = await request.formData();
		const html = formData.get('html')?.toString();

		if (!html) {
			return fail(400, { message: 'No HTML content provided' });
		}
		console.log(html)

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

			// Set a standard browser viewport
			await page.setViewport({ width: 1280, height: 800 });

			// Render HTML string using domcontentloaded
			await page.setContent(html, { 
				waitUntil: 'domcontentloaded'
			});

			// Generate PDF
			const pdfBuffer = await page.pdf({
				format: 'A4',
				printBackground: true,
				margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
			});

			const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

			return {
				success: true,
				pdf: `data:application/pdf;base64,${pdfBase64}`
			};
		} catch (err) {
			console.error('Puppeteer PDF Generation Error:', err);
			return fail(500, { message: 'Failed to generate PDF' });
		} finally {
			if (browser) {
				await browser.close();
			}
		}
	}
};
