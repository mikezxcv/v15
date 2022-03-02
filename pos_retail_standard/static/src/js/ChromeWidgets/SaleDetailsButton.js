odoo.define('pos_retail_standard.SaleDetailsButton', function (require) {
    'use strict';

    const SaleDetailsButton = require('point_of_sale.SaleDetailsButton');
    const Registries = require('point_of_sale.Registries');
    const core = require('web.core');
    const qweb = core.qweb;

    const RetailSaleDetailsButton = (SaleDetailsButton) =>
        class extends SaleDetailsButton {
            constructor() {
                super(...arguments);
            }

            async printSaleDetailReportDirectPosBox() {
                const saleDetails = await this.rpc({
                    model: 'report.point_of_sale.report_saledetails',
                    method: 'get_sale_details',
                    args: [false, false, false, [this.env.pos.pos_session.id]],
                }, {
                    shadow: true,
                    timeout: 65000
                })
                let env = {
                    company: this.env.pos.company,
                    pos: this.env.pos,
                    products: saleDetails.products,
                    payments: saleDetails.payments,
                    taxes: saleDetails.taxes,
                    total_paid: saleDetails.total_paid,
                    date: (new Date()).toLocaleString(),
                };
                let report = qweb.render('SaleDetailsReportXml', env);
                this.env.pos.proxy.printer.print_receipt(report);
                const printResult = await this.env.pos.proxy.printer.print_receipt(report);
                if (!printResult.successful) {
                    await this.env.pos.alert_message({
                        title: printResult.message.title,
                        body: printResult.message.body,
                    });
                } else {
                    this.showPopup('ConfirmPopup', {
                        title: this.env._t('Great'),
                        body: this.env._t('Printed Sale Report Detail, please get a Report Receipt at your Printer !'),
                        disableCancelButton: true,
                    })
                }
            }


            async onClick() {
                if (this.env.pos.config.proxy_ip && this.env.pos.config.iface_print_via_proxy) {
                    return this.printSaleDetailReportDirectPosBox()
                } else {
                    super.onClick()
                }
            }
        }
    Registries.Component.extend(SaleDetailsButton, RetailSaleDetailsButton);

    return RetailSaleDetailsButton;
});
