odoo.define('pos_retail_standard.AbstractReceiptScreen', function (require) {
    'use strict';

    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');
    const Registries = require('point_of_sale.Registries');
    const core = require('web.core');
    const QWeb = core.qweb;

    const RetailAbstractReceiptScreen = (AbstractReceiptScreen) =>
        class extends AbstractReceiptScreen {
            constructor() {
                super(...arguments);
            }

            async _printReceipt() {
                // todo: if epson have add, change template of receipt
                if ((this.env.pos.epson_printer_default || (this.env.pos.config.proxy_ip && this.env.pos.config.iface_print_via_proxy)) && !this.env.pos.reportXML) {
                    await this.env.pos.proxy.printer.print_receipt(QWeb.render('XmlReceipt', this.env.pos.getReceiptEnv()));
                    return true
                }
                if (this.env.pos.config.proxy_ip && this.env.pos.config.iface_print_via_proxy) {
                    console.log('[_printReceipt] POSBOX proxy setup succeed. Auto print direct POSBOX')
                    if (this.env.pos.reportXML) {
                        const printResult = await this.env.pos.proxy.printer.print_receipt(this.env.pos.reportXML);
                        if (printResult.successful) {
                            return true;
                        }
                    } else {
                        return super._printReceipt()
                    }
                    this.env.pos.reportXML = null;
                    return true
                }
                if (this.env.pos.proxy.printer) { // return for support Epson Printer
                    return super._printReceipt()
                }
                if (this.env.pos.proxy.printer) { // for support epson printer without iotbox
                    return super._printReceipt()
                } else {
                    return await this._printWeb();
                }

            }
        }
    Registries.Component.extend(AbstractReceiptScreen, RetailAbstractReceiptScreen);

    return RetailAbstractReceiptScreen;
});
