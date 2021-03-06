odoo.define('pos_retail_standard.PosOrderLines', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class PosOrderLines extends PosComponent {
        constructor() {
            super(...arguments);
        }

        get highlight() {
            return this.props.order !== this.props.selectedOrder ? '' : 'highlight';
        }

        get OrderLines() {
            const order = this.props.order
            if (!order) {
                return []
            }
            const lines = order['lines'];
            if (lines && lines.length) {
                return lines
            } else {
                return []
            }
        }
    }

    PosOrderLines.template = 'PosOrderLines';

    Registries.Component.add(PosOrderLines);

    return PosOrderLines;
});
