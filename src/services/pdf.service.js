const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const storagePath = process.env.PDF_STORAGE_PATH || './storage/pdfs';

// Ensure storage dir exists
if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
}

const COLORS = {
    primary: '#2563EB',
    dark: '#1E293B',
    muted: '#64748B',
    light: '#F1F5F9',
    success: '#16A34A',
    danger: '#DC2626',
    border: '#E2E8F0',
};

/**
 * Generate PDF invoice buffer
 */
const generateInvoicePDF = async (invoice) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            info: {
                Title: `Invoice ${invoice.invoice_number}`,
                Author: invoice.tenant_name,
                Subject: 'Tax Invoice',
            },
        });

        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 100; // accounting for margins

        // ─── Header ───────────────────────────────────────────────
        doc.rect(0, 0, doc.page.width, 120).fill(COLORS.primary);

        doc.font('Helvetica-Bold')
            .fontSize(28)
            .fillColor('white')
            .text('TAX INVOICE', 50, 35);

        doc.font('Helvetica')
            .fontSize(11)
            .fillColor('rgba(255,255,255,0.85)')
            .text(invoice.tenant_name || 'Your Company', 50, 70)
            .text(invoice.tenant_email || '', 50, 86);

        // Invoice number badge (top right)
        doc.font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('white')
            .text(`#${invoice.invoice_number}`, 400, 45, { width: 150, align: 'right' });

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor('rgba(255,255,255,0.75)')
            .text(`Status: ${(invoice.status || '').toUpperCase()}`, 400, 68, { width: 150, align: 'right' });

        // ─── Info Block ───────────────────────────────────────────
        doc.y = 140;

        // From block
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('FROM', 50, doc.y);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark).text(invoice.tenant_name || '');
        if (invoice.address_line1) doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(invoice.address_line1);
        if (invoice.city) doc.text(`${invoice.city}, ${invoice.state} ${invoice.postal_code}`);
        if (invoice.tenant_gstin) doc.text(`GSTIN: ${invoice.tenant_gstin}`);

        // To block
        const fromBottom = doc.y;
        doc.y = 140;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('BILL TO', 300, doc.y);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark)
            .text(invoice.company_name || invoice.customer_name || '', 300, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted)
            .text(invoice.customer_email || '', 300)
            .text(invoice.customer_phone || '', 300);

        doc.y = Math.max(fromBottom, doc.y) + 20;

        // ─── Dates Row ────────────────────────────────────────────
        const dateY = doc.y;
        doc.rect(50, dateY, pageWidth, 40).fill(COLORS.light);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
        const cols = [
            { label: 'ISSUE DATE', value: formatDate(invoice.issue_date), x: 60 },
            { label: 'DUE DATE', value: formatDate(invoice.due_date), x: 210 },
            { label: 'BILL PERIOD', value: invoice.billing_period_start ? `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}` : '-', x: 360 },
        ];
        cols.forEach(c => {
            doc.text(c.label, c.x, dateY + 8);
            doc.font('Helvetica').fontSize(10).fillColor(COLORS.dark).text(c.value, c.x, dateY + 22);
        });

        doc.y = dateY + 60;

        // ─── Items Table ──────────────────────────────────────────
        const tableTop = doc.y;
        const colWidths = { desc: 230, qty: 60, price: 80, discount: 70, amount: 80 };

        // Table header
        doc.rect(50, tableTop, pageWidth, 28).fill(COLORS.dark);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('white');
        doc.text('DESCRIPTION', 60, tableTop + 10);
        doc.text('QTY', 290, tableTop + 10, { width: colWidths.qty, align: 'right' });
        doc.text('UNIT PRICE', 350, tableTop + 10, { width: colWidths.price, align: 'right' });
        doc.text('DISC%', 430, tableTop + 10, { width: colWidths.discount, align: 'right' });
        doc.text('AMOUNT', 500, tableTop + 10, { width: colWidths.amount, align: 'right' });

        let itemY = tableTop + 28;
        const items = invoice.items || [];

        items.forEach((item, i) => {
            const isEven = i % 2 === 0;
            const rowHeight = 32;
            if (isEven) doc.rect(50, itemY, pageWidth, rowHeight).fill('#F8FAFC');

            doc.font('Helvetica').fontSize(9).fillColor(COLORS.dark);
            doc.text(item.description || '', 60, itemY + 8, { width: 220, lineBreak: false });
            if (item.period_start) {
                doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
                    .text(`${formatDate(item.period_start)} - ${formatDate(item.period_end)}`, 60, itemY + 20);
            }
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.dark);
            doc.text(item.quantity?.toString() || '1', 290, itemY + 12, { width: colWidths.qty, align: 'right' });
            doc.text(formatCurrency(item.unit_price), 350, itemY + 12, { width: colWidths.price, align: 'right' });
            doc.text(`${item.discount_percent || 0}%`, 430, itemY + 12, { width: colWidths.discount, align: 'right' });
            doc.text(formatCurrency(item.amount), 500, itemY + 12, { width: colWidths.amount, align: 'right' });

            itemY += rowHeight;
        });

        // ─── Totals ───────────────────────────────────────────────
        doc.moveTo(50, itemY + 5).lineTo(50 + pageWidth, itemY + 5).strokeColor(COLORS.border).stroke();
        let totY = itemY + 15;

        const addTotalRow = (label, value, bold = false, color = COLORS.dark) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
                .fillColor(COLORS.muted).text(label, 380, totY)
                .fillColor(color).text(formatCurrency(value), 490, totY, { width: 80, align: 'right' });
            totY += 18;
        };

        addTotalRow('Subtotal:', invoice.subtotal);
        if (parseFloat(invoice.discount_amount) > 0) addTotalRow(`Discount (${invoice.discount_percent}%):`, -invoice.discount_amount);

        const taxes = invoice.taxes || [];
        taxes.forEach(t => addTotalRow(`${t.tax_name} (${t.tax_rate}%):`, t.tax_amount));

        doc.rect(380, totY, 170, 30).fill(COLORS.primary);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('white')
            .text('TOTAL:', 390, totY + 9)
            .text(formatCurrency(invoice.total_amount), 470, totY + 9, { width: 75, align: 'right' });
        totY += 40;

        if (parseFloat(invoice.amount_paid) > 0) {
            addTotalRow('Amount Paid:', invoice.amount_paid, false, COLORS.success);
            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.danger)
                .text('AMOUNT DUE:', 380, totY)
                .text(formatCurrency(invoice.amount_due), 490, totY, { width: 80, align: 'right' });
        }

        // ─── Notes ────────────────────────────────────────────────
        if (invoice.notes) {
            doc.y = totY + 40;
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('NOTES');
            doc.moveDown(0.3);
            doc.font('Helvetica').fontSize(10).fillColor(COLORS.dark).text(invoice.notes);
        }

        if (invoice.terms) {
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('TERMS & CONDITIONS');
            doc.moveDown(0.3);
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(invoice.terms);
        }

        // ─── Footer ───────────────────────────────────────────────
        const footerY = doc.page.height - 60;
        doc.rect(0, footerY, doc.page.width, 60).fill(COLORS.light);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
            .text('Thank you for your business!', 50, footerY + 15, { width: pageWidth, align: 'center' })
            .text(`Generated by SaaS Billing Platform • ${new Date().toLocaleDateString()}`, 50, footerY + 32, { width: pageWidth, align: 'center' });

        doc.end();
    });
};

const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `₹${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

module.exports = { generateInvoicePDF };
