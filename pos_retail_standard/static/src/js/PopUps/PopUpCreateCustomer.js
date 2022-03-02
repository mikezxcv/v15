odoo.define('pos_retail_standard.PopUpCreateCustomer', function (require) {
    'use strict';

    const {useState, useRef, useContext} = owl.hooks;
    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    const contexts = require('point_of_sale.PosContext');
    const {useExternalListener} = owl.hooks;

    class PopUpCreateCustomer extends AbstractAwaitablePopup {
        constructor() {
            super(...arguments);
            this.changes = {
                error: this.env._t('Name is required'),
                valid: null,
                mobile: this.props.mobile || ''

            }
            this.state = useState(this.changes);
            this.orderUiState = useContext(contexts.orderManagement);
            useExternalListener(window, 'keyup', this._keyUp);
        }

        _keyUp(event) {
            if (event.key == 'Enter') {
                this.confirm()
            }
        }

        async OnChange(event) {
            const self = this;
            if (event.target.type == 'checkbox') {
                this.changes[event.target.name] = event.target.checked;
            }
            if (event.target.type == 'file') {
                await this.env.pos.chrome.loadImageFile(event.target.files[0], function (res) {
                    if (res) {
                        var contents = $(self.el);
                        contents.scrollTop(0);
                        contents.find('.client-picture img, .client-picture .fa').remove();
                        contents.find('.client-picture').append("<img src='" + res + "'>");
                        contents.find('.detail.picture').remove();
                        self.changes['image_1920'] = res;
                    }
                });
            }
            if (!['checkbox', 'file'].includes(event.target.type) && event.target.value) {
                this.changes[event.target.name] = event.target.value;
            }
            if (!this.changes['name']) {
                this.state.error = this.env._t('Name is required')
                return false
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
            if (this.changes['mobile'] && this.env.pos.config.check_duplicate_phone) {
                const partners = this.env.pos.db.search_partner(this.changes['mobile'])
                const partnerDuplicate = partners.find(p => p.modile == this.changes.mobile)
                if (partnerDuplicate) {
                    this.state.error = this.env._t('This mobile number have used buy another Customer')
                    return false
                }
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
            if (this.changes['phone'] && this.env.pos.config.check_duplicate_phone) {
                const partners = this.env.pos.db.search_partner(thihones.changes['phone'])
                const partnerDuplicate = partners.find(p => p.modile == this.changes.phone)
                if (partnerDuplicate) {
                    this.state.error = this.env._t('This Phone number have used buy another Customer')
                    return false
                }
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
            if (this.changes['email'] && this.env.pos.config.check_duplicate_email) {
                const partners = this.env.pos.db.search_partner(this.changes['email'])
                const partnerDuplicate = partners.find(p => p.modile == this.changes.email)
                if (partnerDuplicate) {
                    this.state.error = this.env._t('This Email number have used buy another Customer')
                    return false
                }
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
            if (this.changes['birthday_date'] && new Date(this.changes['birthday_date']).getTime() >= new Date().getTime()) {
                this.state.error = this.env._t('BirthDay required smaller than today')
                return false
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
            if (this.env.pos.config.check_duplicate_phone && (!this.changes['mobile'] || !this.changes['phone'])) {
                this.state.error = this.env._t('Mobile or Phone is required')
                return false
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
            if (this.env.pos.config.check_duplicate_email && !this.changes['email']) {
                this.state.error = this.env._t('Email is required')
                return false
            } else {
                this.state.valid = this.env._t('Ready to Create')
                this.state.error = null
            }
        }


        getPayload() {
            return this.changes
        }
    }

    PopUpCreateCustomer.template = 'PopUpCreateCustomer';
    PopUpCreateCustomer.defaultProps = {
        confirmText: 'Ok',
        cancelText: 'Cancel',
        array: [],
        isSingleItem: false,
    };

    Registries.Component.add(PopUpCreateCustomer);

    return PopUpCreateCustomer
});
