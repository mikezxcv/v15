odoo.define('pos_retail_standard.Printer', function (require) {
    const Printer = require('point_of_sale.Printer');
    const core = require('web.core');
    const _t = core._t;
    const {Gui} = require('point_of_sale.Gui');
    const session = require('web.session');

    Printer.Printer.include({
        _onIoTActionResult: function (data) {
            try {
                this._super(data)
            } catch (e) {
                return Gui.showPopup('ErrorPopup', {
                    title: _t('Error'),
                    body: _t('Your POS Disconnected Kitchen Printer, please Your POS Setting or Your Internet Connection')
                })
            }
        },
        print_receipt: async function (receipt) { // TODO: if proxy_id is added, it meaning posbox installed else it meaning iotbox
            // kimanh: normal original pos if can not connect printer, can not send order
            // we need force it for use kitchen screen
            if (receipt) {
                console.log('[print_receipt]: ' + receipt)
            } else {
                return this._super(receipt)
            }
            if (receipt && this.pos.config.local_network_printer && this.pos.config.local_network_printer_ip_address && this.pos.config.local_network_printer_port) {
                const params = {
                    'receipt': receipt
                }
                params.ip = this.pos.config.local_network_printer_ip_address
                params.port = this.pos.config.local_network_printer_port
                return session.rpc('/printer_network/print_xml_receipt', params || {}, {shadow: true}).then(function (results) {
                    if (results.error) {
                        return window.posmodel.alert_message({
                            title: _t('Network Printer Error'),
                            body: JSON.stringify(results.message, null, '..........')
                        })
                    } else {
                        return window.posmodel.alert_message({
                            title: _t('Successfully'),
                            body: _t('Print Successfully, please look at to your printer and get Receipt !!'),
                        })
                    }
                });
            }

            let response = this.printResultGenerator.Successful()
            // TODO: use iotbox call to printer network
            if (this.pos.epson_printer_default || (this.pos.config.proxy_ip && this.pos.config.iface_print_via_proxy)) {
                if (this.pos.config.duplicate_receipt && this.pos.config.duplicate_number > 1) {
                    for (let i = 0; i < this.pos.config.duplicate_number; i++) {
                        this.print_direct_receipt(receipt);
                    }
                } else {
                    this.print_direct_receipt(receipt);
                }
                console.log('[print_receipt] print_direct_receipt')
                return response
            }
            if (this.pos.config.duplicate_receipt && this.pos.config.duplicate_number > 1) {
                for (let i = 0; i < this.pos.config.duplicate_number; i++) {
                    if (receipt) {
                        this.receipt_queue.push(receipt);
                    }
                    let image, sendPrintResult;
                    while (this.receipt_queue.length > 0) {
                        try {
                            receipt = this.receipt_queue.shift();
                            image = await this.htmlToImg(receipt);
                            sendPrintResult = await this.send_printing_job(image);
                        } catch (error) {
                            // Error in communicating to the IoT box.
                            this.receipt_queue.length = 0;
                            response = this.printResultGenerator.IoTActionError();
                            console.warn(response)
                        }
                    }
                }
                console.log('[print_receipt] duplicate_receipt')
                return response
            } else {
                let coreResponse = await this._super(receipt)
                if (coreResponse && !coreResponse['successful'] && coreResponse['message']) {
                    this.pos.chrome.showNotification('Error', coreResponse['message'])
                }
                return response;
            }
        },
        // TODO: print via iotbox 20.10 and format is xml, not image
        async print_direct_receipt(receipt) {
            await this.connection.rpc('/hw_proxy/print_xml_receipt', {
                receipt: receipt,
            });
        },
        // TODO: removed 17.02.2020 for support iotbox 20.10
        open_cashbox: function () {
            if (this.connection && this.connection.server == "http://localhost:8069") {
                return true
            }
            if (this.pos.config.proxy_ip) {
                return this.connection.rpc('/hw_proxy/open_cashbox', {}).then(function (result) {
                    console.log('POS Box 17 open cashbox');
                })
            } else {
                this._super();
            }
        },
        // TODO: fixed loading times send img to printer, and running background
        send_printing_job: function (img) {
            if (this.connection && this.connection.server == "http://localhost:8069") {
                return true
            }
            if (this.pos.config.proxy_ip) {
                return false
            } else {
                return this._super(img);
                // return this.connection.rpc('/hw_proxy/default_printer_action', {
                //     data: {
                //         action: 'print_receipt',
                //         receipt: img,
                //     }
                // }, {shadow: true, timeout: 1500});
            }
        },
    });

})
