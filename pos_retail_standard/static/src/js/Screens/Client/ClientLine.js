odoo.define('pos_retail_standard.ClientLine', function (require) {
    'use strict';

    const ClientLine = require('point_of_sale.ClientLine');
    const {useListener} = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');
    const {useState} = owl.hooks;

    const RetailClientLine = (ClientLine) =>
        class extends ClientLine {
            constructor() {
                super(...arguments);
                useListener('set-message', this.sendMessage);
                this.state = useState({
                    refresh: 'done',
                });
            }

            _syncPartner(partners) {
                let willRender = false
                if (partners.length == 1 && partners[0]['write_date'] != this.props.partner.write_date) {
                    this.env.pos.partner_model.loaded(this.env.pos, partners)
                    this.env.pos.indexed_db.write('res.partner', partners);
                    this.props.partner = partners[0]
                    this.env.pos.update_customer_in_cart(partners);
                    willRender = true
                }
                if (partners.length == 0) {
                    this.env.pos.indexed_db.unlink('res.partner', this.props.partner);
                    this.props.partner['removed'] = true
                    this.env.pos.remove_partner_deleted_outof_orders(this.props.partner['id']);
                    willRender = true
                }
                if (willRender) {
                    this.render()
                }
            }

            async _autoSyncBackend() {
                this.state.refresh = 'connecting'
                this.env.pos.set_synch('connecting', 'Syncing')
                let partners = await this.env.pos.getDatasByModel('res.partner', [['id', '=', this.props.partner.id]])
                if (partners != null) {
                    this._syncPartner(partners)
                    this.state.refresh = 'done'
                    this.env.pos.set_synch('connected', '')
                } else {
                    this.state.refresh = 'error'
                    this.env.pos.set_synch('disconnected', 'Odoo or Your Internet Offline')
                }
            }

            mounted() {
                super.mounted();
                if (this.env.pos.config.sync_partners_realtime) {
                    this._autoSyncBackend()
                }
                posbus.on('sync.client', this, this._syncDirectBackendPartner)
            }

            willUnmount() {
                super.willUnmount();
                posbus.off('sync.client', this, null)
            }

            _syncDirectBackendPartner(partner_id) {
                if (partner_id == this.props.partner.id) {
                    this._autoSyncBackend()
                }
            }

            async showPurchasedHistories() {
                const {confirmed, payload: result} = await this.showTempScreen(
                    'PosOrderScreen',
                    {
                        order: null,
                        selectedClient: this.props.partner
                    }
                );
            }

            _onMouseEnter(event) {
                this._autoSyncBackend()
            }


            async reChargePoints() {
                let {confirmed, payload: newPoints} = await this.showPopup('NumberPopup', {
                    title: this.props.partner['name'] + this.env._t(' have total points: ') + this.env.pos.format_currency_no_symbol(this.props.partner['pos_loyalty_point']) + this.env._t(' How many points need ReCharge ?'),
                    startingValue: 0
                })
                if (confirmed) {
                    this.props.partner['pos_loyalty_point']
                    await this.rpc({
                        model: 'res.partner',
                        method: 'write',
                        args: [[this.props.partner.id], {
                            'pos_loyalty_point_import': newPoints
                        }],
                    })
                    this._autoSyncBackend()
                }
            }

            showMore() {
                const partner = this.props.partner;
                const link = window.location.origin + "/web#id=" + partner.id + "&view_type=form&model=res.partner";
                window.open(link, '_blank')
            }

            async archiveClient() {
                let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Warning'),
                    body: this.env._t('Are you want move customer to Black List, this customer will not display in this Screen if you refresh POS Page')
                })
                if (confirmed) {
                    await this.rpc({
                        model: 'res.partner',
                        method: 'write',
                        args: [[this.props.partner.id], {
                            active: false,
                        }],
                    })
                    this._autoSyncBackend()
                    this.showPopup('ConfirmPopup', {
                        title: this.props.partner.name + this.env._t(' moved to BlackList Customers (active is False)'),
                        body: this.env._t('You can reload POS page, all clients Active is false will not display in this Screen')
                    })
                }
            }

            async addBarcode() {
                let newBarcode = await this.rpc({ // todo: template rpc
                    model: 'res.partner',
                    method: 'add_barcode',
                    args: [[this.props.partner.id]]
                })
                if (newBarcode) {
                    this._autoSyncBackend()
                }
            }

            async printBarcode() {
                await this.env.pos.do_action('pos_retail_standard.res_partner_card_badge', {
                    additional_context: {
                        active_id: this.props.partner.id,
                        active_ids: [this.props.partner.id],
                    }
                }, {
                    shadow: true,
                    timeout: 6500
                });
            }

            async sendMessage(selectedClient) {
                if (!selectedClient['mobile'] && !selectedClient['phone']) {
                    return this.env.pos.alert_message({
                        title: this.env._t('Warning'),
                        body: this.env._t('Customer missed Mobile and Phone, it not possible send message via WhatsApp')
                    })
                } else {
                    let startingValue = this.env._t('Dear ') + selectedClient.name + '\n';
                    startingValue += this.env._t('---- *** This is your account information *** ------ \n');
                    startingValue += this.env._t('You have Total Loyalty Points: ') + this.env.pos.format_currency_no_symbol(selectedClient.pos_loyalty_point) + '\n';
                    startingValue += this.env._t('With Credit Points: ') + this.env.pos.format_currency_no_symbol(selectedClient.balance) + '\n';
                    startingValue += this.env._t('With Wallet Points: ') + this.env.pos.format_currency_no_symbol(selectedClient.wallet) + '\n';
                    startingValue += this.env._t('-------- \n');
                    startingValue += this.env._t('Thanks you for choice our services.');
                    let {confirmed, payload: messageNeedSend} = await this.showPopup('TextAreaPopup', {
                        title: this.env._t('What message need to send Client ?'),
                        startingValue: startingValue
                    })
                    if (confirmed) {
                        let mobile_no = selectedClient['phone'] || selectedClient['mobile']
                        let message = messageNeedSend
                        let responseOfWhatsApp = await this.rpc({
                            model: 'pos.config',
                            method: 'send_message_via_whatsapp',
                            args: [[], this.env.pos.config.id, mobile_no, message],
                        });
                        if (responseOfWhatsApp && responseOfWhatsApp['id']) {
                            return this.showPopup('ConfirmPopup', {
                                title: this.env._t('Successfully'),
                                body: this.env._t("Send successfully message to your Client's Phone WhatsApp: ") + mobile_no,
                                disableCancelButton: true,
                            })
                        } else {
                            return this.env.pos.alert_message({
                                title: this.env._t('Error'),
                                body: this.env._t("Send Message is fail, please check WhatsApp API and Token of your pos config or Your Server turn off Internet"),
                                disableCancelButton: true,
                            })
                        }
                    }
                }
            }

            get countOrdersByClient() {
                if (this.env.pos.db.order_by_partner_id[this.props.partner.id]) {
                    return this.env.pos.db.order_by_partner_id[this.props.partner.id].length
                } else {
                    return 0
                }
            }
        }
    Registries.Component.extend(ClientLine, RetailClientLine);

    return RetailClientLine;
});
