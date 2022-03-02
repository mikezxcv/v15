odoo.define('pos_retail_standard.PosOrderRow', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const {useState} = owl.hooks;

    class PosOrderRow extends PosComponent {
        constructor() {
            super(...arguments);
            this.state = useState({
                refresh: 'done',
            });
        }

        async _autoSyncBackend() {
            console.log('[_autoSyncBackend] Syncing Order ID: ' + this.props.order.id)
            this.state.refresh = 'connecting'
            const self = this;
            let order_object = this.env.pos.get_model('pos.order');
            await this.rpc({
                model: 'pos.order',
                method: 'search_read',
                fields: order_object.fields,
                args: [[['id', '=', this.props.order.id]]]
            }, {
                shadow: true,
                timeout: 7500
            }).then(function (orders) {
                if (orders.length == 1) {
                    self.props.order = orders[0]
                }
                self.env.pos.set_synch('connected', '')
                self.state.refresh = 'done'
            }, function (error) {
                self.state.refresh = 'error'
                self.env.pos.set_synch('disconnected', 'Offline Mode')
            })
            let pos_order_line_object = this.env.pos.get_model('pos.order.line');
            await this.rpc({
                model: 'pos.order.line',
                method: 'search_read',
                fields: pos_order_line_object.fields,
                args: [[['order_id', '=', this.props.order.id]]]
            }, {
                shadow: true,
                timeout: 7500
            }).then(function (lines) {
                self.props.order['lines'] = lines
            }, function (error) {
                self.state.refresh = 'error'
                self.env.pos.set_synch('disconnected', 'Offline Mode')
            })
        }

        get highlight() {
            return this.props.order !== this.props.selectedOrder ? '' : 'highlight';
        }

        showMore() {
            const order = this.props.order;
            const link = window.location.origin + "/web#id=" + order.id + "&view_type=form&model=pos.order";
            window.open(link, '_blank')
        }
    }

    PosOrderRow.template = 'PosOrderRow';

    Registries.Component.add(PosOrderRow);

    return PosOrderRow;
});
