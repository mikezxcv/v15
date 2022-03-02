odoo.define('pos_retail_standard.ProductScreen', function (require) {
    'use strict';

    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');
    var BarcodeEvents = require('barcodes.BarcodeEvents').BarcodeEvents;
    const {useListener} = require('web.custom_hooks');
    const {useState} = owl.hooks;

    const liveStreamConfig = {
        inputStream: {
            type: "LiveStream",
            constraints: {
                width: {min: 150},
                height: {min: 150},
                aspectRatio: {min: 1, max: 500},
                facingMode: "environment" // or "user" for the front camera
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: (navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4),
        decoder: {
            "readers": [
                {"format": "ean_reader", "config": {}}
            ]
        },
        locate: true
    };
    const fileConfig = $.extend(
        {},
        liveStreamConfig,
        {
            inputStream: {
                size: 800
            }
        }
    );

    const RetailProductScreen = (ProductScreen) =>
        class extends ProductScreen {
            constructor() {
                super(...arguments);
                this.buffered_key_events = [];
                this._onKeypadKeyDown = this._onKeypadKeyDown.bind(this);
                useListener('show-popup', this.removeEventKeyboad);
                if (this.env.pos.config.showFullFeatures == undefined) {
                    this.env.pos.showFullFeatures = true
                } else {
                    this.env.pos.showFullFeatures = this.env.pos.config.showFullFeatures
                }
                let status = this.showCashBoxOpening()
                this.state = useState({
                    cashControl: status,
                    numpadMode: 'quantity',
                    screen: 'Products'
                });
                useListener('remove-selected-customer', this._onRemoveSelectedClient);
                useListener('remove-selected-order', this._onRemoveSelectedOrder);
            }

            mounted() {
                super.mounted();
                posbus.on('closed-popup', this, this.addEventKeyboad);
                posbus.on('back-products-screen', this, this._resetScreen);
                posbus.on('set-screen', this, this._setScreen);
                posbus.on('table-set', this, this._resetScreen);
                posbus.on('close-cash-screen', this, this._closingOpenCashScreen);
                posbus.on('open-cash-screen', this, this._openOpenCashScreen);
                this.addEventKeyboad()
                if (this.env.pos.config.barcode_scan_with_camera) {
                    try {
                        this.initCamera();
                        this.addCameraScanBarcodeEvent();
                        this._automaticScanBarcodes()
                    } catch (ex) {
                        return
                    }
                }
                posbus.trigger('open-header')
            }

            willUnmount() {
                super.willUnmount();
                posbus.off('closed-popup', this, null);
                posbus.off('back-products-screen', this, null);
                posbus.off('set-screen', this, null);
                posbus.off('close-cash-screen', this, null);
                posbus.off('open-cash-screen', this, null);
                this.removeEventKeyboad()
                if (this.env.pos.config.barcode_scan_with_camera) {
                    try {
                        Quagga.stop();
                    } catch (ex) {
                        return
                    }

                }
            }

            get getMaxWidthLeftScreen() {
                if (this.env.isMobile) {
                    return 'unset !important'
                } else {
                    return this.env.session.config.cart_width + '% !important'
                }
            }

            _closingOpenCashScreen() {
                this.state.cashControl = false
            }

            _openOpenCashScreen() {
                this.state.cashControl = true
                // this.render()
            }

            _onMouseEnter(event) {
                $(event.currentTarget).css({'width': '450px'})
            }

            _onMouseLeave(event) {
                $(event.currentTarget).css({'width': '150px'})
            }

            async _onRemoveSelectedOrder() {
                if (this.env.pos.config.validate_remove_order) {
                    let validate = await this.env.pos._validate_action(this.env._t('Delete this Order'));
                    if (!validate) {
                        return false;
                    }
                }
                const selectedOrder = this.env.pos.get_order();
                const screen = selectedOrder.get_screen_data();
                if (['ProductScreen', 'PaymentScreen'].includes(screen.name) && selectedOrder.get_orderlines().length > 0) {
                    const {confirmed} = await this.showPopup('ErrorPopup', {
                        title: 'Existing orderlines',
                        body: `${selectedOrder.name} has total amount of ${this.env.pos.format_currency(selectedOrder.get_total_with_tax())}, are you sure you want delete this order?`,
                    });
                    if (!confirmed) return;
                }
                if (selectedOrder) {
                    selectedOrder.destroy({reason: 'abandon'});
                    this.showScreen('TicketScreen');
                    posbus.trigger('order-deleted');
                }
                this.env.pos.alert_message({
                    title: this.env._t('Alert'),
                    body: selectedOrder['name'] + this.env._t(' just removed. If you need create new Order, please click on [New Order] button on left header'),
                    timer: 4000,
                })
            }

            async _onRemoveSelectedClient() {
                const selectedOrder = this.env.pos.get_order();
                if (selectedOrder) {
                    const lastClientSelected = selectedOrder.get_client()
                    selectedOrder.set_client(null);
                    if (!lastClientSelected) {
                        this.env.pos.chrome.showNotification(this.env._t('Alert'), this.env._t('Order blank Customer'))
                        return true
                    }
                    this.env.pos.chrome.showNotification(lastClientSelected['name'], this.env._t(' Deselected, out of Order'))
                }
            }

            get blockScreen() {
                const selectedOrder = this.env.pos.get_order();
                if (!selectedOrder || !selectedOrder.is_return) {
                    return false
                } else {
                    return true
                }
            }

            get allowDisplayListFeaturesButton() {
                if (this.state.screen == 'Products') {
                    return true
                } else {
                    return false
                }
            }

            showFullFeature() {
                if (!this.env.pos.showFullFeatures) {
                    this.env.pos.showFullFeatures = true
                    this.env.pos.config.showFullFeatures = true
                } else {
                    this.env.pos.showFullFeatures = false
                    this.env.pos.config.showFullFeatures = false
                }
                this.render()
                // if (this.env.pos.showFullFeatures) {
                //     posbus.trigger('open-header')
                // } else {
                //     posbus.trigger('hide-header')
                // }
            }

            get blockScreen() {
                const selectedOrder = this.env.pos.get_order();
                if (!selectedOrder || !selectedOrder.is_return) {
                    return false
                } else {
                    return true
                }
            }

            _resetScreen() {
                this.state.screen = 'Products'
                this.env.pos.config.sync_multi_session = true
                posbus.trigger('open-header')
            }

            backToCart() {
                posbus.trigger('set-screen', 'Products')
                this.env.pos.config.sync_multi_session = true
                posbus.trigger('open-header')
            }

            _setScreen(screenName) {
                console.log('[_setScreen] ' + screenName)
                if (screenName != 'Products') {
                    posbus.trigger('hide-header')
                }
                this.state.screen = screenName
            }

            initCamera() {
                var self = this;
                try {
                    Quagga.init(
                        liveStreamConfig,
                        function (err) {
                            if (err) {
                                console.error(err.name)
                                console.error(err.message)
                                Quagga.stop();
                                return true;
                            }
                            Quagga.start();
                        }
                    );
                } catch (e) {
                    console.warn(e);
                    this.env.pos.alert_message({
                        title: this.env._t('Error'),
                        body: this.env._t("Your Camera Device not ready scanning barcode. This future only support SSL (https). Please setup your Odoo within ssl")
                    })
                }
            }

            async addCameraScanBarcodeEvent() {
                this.barcodeScan = [];
                if (this.camera_registered) {
                    return
                }
                const self = this;
                await Quagga.onProcessed(function (result) {
                    var drawingCtx = Quagga.canvas.ctx.overlay,
                        drawingCanvas = Quagga.canvas.dom.overlay;

                    if (result) {
                        if (result.boxes) {
                            drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                            result.boxes.filter(function (box) {
                                return box !== result.box;
                            }).forEach(function (box) {
                                Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {
                                    color: "green",
                                    lineWidth: 2
                                });
                            });
                        }

                        if (result.box) {
                            Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {
                                color: "#00F",
                                lineWidth: 2
                            });
                        }

                        if (result.codeResult && result.codeResult.code) {
                            Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {
                                color: 'red',
                                lineWidth: 3
                            });
                        }
                    }
                });

                // Once a barcode had been read successfully, stop quagga and
                // close the modal after a second to let the user notice where
                // the barcode had actually been found.
                await Quagga.onDetected(function (result) {
                    if (result.codeResult.code) {
                        const code = result.codeResult.code;
                        console.log(code);
                        if (!self.barcodeScan.includes(code)) {
                            self.barcodeScan.push(code)
                        }
                        Quagga.stop();
                        setTimeout(function () {
                            self.addCameraScanBarcodeEvent()
                        }, self.env.pos.config.barcode_scan_timeout)
                    }
                });
                this.camera_registered = true;
            }

            _automaticScanBarcodes() {
                if (this.barcodeScan && this.barcodeScan.length) {
                    this.env.pos.scanDirectCamera = true
                    for (let i = 0; i < this.barcodeScan.length; i++) {
                        let code = this.barcodeScan[i];
                        this.env.pos.barcode_reader.scan(code);
                    }
                    this.barcodeScan = []
                    this.initCamera();
                    this.env.pos.scanDirectCamera = false
                }
                setTimeout(_.bind(this._automaticScanBarcodes, this), 200);
            }

            async _updateSelectedOrderline(event) {
                if (this.env.pos.lockedUpdateOrderLines) {
                    return true
                } else {
                    return super._updateSelectedOrderline(event)
                }
            }

            addEventKeyboad() {
                console.log('add event keyboard')
                $(document).off('keydown.productscreen', this._onKeypadKeyDown);
                $(document).on('keydown.productscreen', this._onKeypadKeyDown);
            }

            removeEventKeyboad() {
                console.log('remove event keyboard')
                $(document).off('keydown.productscreen', this._onKeypadKeyDown);
            }

            _onKeypadKeyDown(ev) {
                if (this.state.screen != 'Products') {
                    return true
                }
                if (!_.contains(["INPUT", "TEXTAREA"], $(ev.target).prop('tagName')) && ev.keyCode !== 13) {
                    clearTimeout(this.timeout);
                    this.buffered_key_events.push(ev);
                    this.timeout = setTimeout(_.bind(this._keyboardHandler, this), BarcodeEvents.max_time_between_keys_in_ms);
                }
                if (ev.keyCode == 27) {  // esc key (clear search)
                    clearTimeout(this.timeout);
                    this.buffered_key_events.push(ev);
                    this.timeout = setTimeout(_.bind(this._keyboardHandler, this), BarcodeEvents.max_time_between_keys_in_ms);
                }
            }

            _setValue(val) {
                if (this.currentOrder.finalized || this.state.screen != 'Products') {
                    console.warn('[Screen products state is not Products] or [Order is finalized] reject trigger event keyboard]')
                    return false
                } else {
                    super._setValue(val)
                }
            }

            async _keyboardHandler() {
                const selectedOrder = this.env.pos.get_order()
                const selecteLine = selectedOrder.get_selected_orderline()
                if (this.buffered_key_events.length > 2) {
                    this.buffered_key_events = [];
                    return true;
                }
                for (let i = 0; i < this.buffered_key_events.length; i++) {
                    let event = this.buffered_key_events[i]
                    console.log('[_keyboardHandler] ' + event.keyCode)
                    // -------------------------- product screen -------------
                    let key = '';
                    let keyAccept = false;
                    // if ([9, 37, 39].includes(event.keyCode)) { // arrow left and right
                    //     const query = $('.search >input').val();
                    //     const products = this.env.pos.db.search_product_in_category(0, query)
                    //     if (products.length > 0) {
                    //         let productSelected = products.find(p => p.selected)
                    //         if (productSelected) {
                    //             productSelected['selected'] = false
                    //             for (let i = 0; i < products.length; i++) {
                    //                 if (products[i]['id'] == productSelected['id']) {
                    //                     if (event.keyCode == 9 || event.keyCode == 39) {
                    //                         if ((i + 1) < products.length) {
                    //                             products[i + 1]['selected'] = true
                    //                         } else {
                    //                             products[0]['selected'] = true
                    //                         }
                    //                         break
                    //                     } else {
                    //                         let line_number;
                    //                         if (i == 0) {
                    //                             line_number = products.length - 1
                    //                         } else {
                    //                             line_number = i - 1
                    //                         }
                    //                         products[line_number]['selected'] = true
                    //                         break
                    //                     }
                    //
                    //                 }
                    //             }
                    //         } else {
                    //             products[0]['selected'] = true
                    //         }
                    //         this.render()
                    //     }
                    //     keyAccept = true
                    // }
                    // if (event.keyCode == 13) { // enter
                    //     const query = $('.search >input').val();
                    //     const products = this.env.pos.db.search_product_in_category(0, query)
                    //     let productSelected = products.find(p => p.selected)
                    //     if (productSelected) {
                    //         productSelected['selected'] = false;
                    //         this._clickProduct({
                    //             detail: productSelected
                    //         })
                    //     }
                    //     keyAccept = true
                    // }
                    if (event.keyCode == 8 && this.env.pos.config.allow_remove_line && selecteLine) { // Del
                        selectedOrder.remove_orderline(selecteLine);
                        keyAccept = true
                    }
                    if (event.keyCode == 17 && selecteLine) { // ctrl
                        let uom_items = this.env.pos.uoms_prices_by_product_tmpl_id[selecteLine.product.product_tmpl_id];
                        if (uom_items) {
                            let list = uom_items.map((u) => ({
                                id: u.id,
                                label: u.uom_id[1],
                                item: u
                            }));
                            let {confirmed, payload: unit} = await this.showPopup('SelectionPopup', {
                                title: this.env._t('Select Unit of Measure for : ') + selecteLine.product.display_name,
                                list: list
                            })
                            if (confirmed) {
                                selecteLine.set_unit(unit.uom_id[0], unit.price)
                            }
                        }
                        keyAccept = true
                    }
                    // if (event.keyCode == 27) { // esc , no need this code, SearchBar onKeyup() handle it
                    //     keyAccept = true
                    // }
                    if (event.keyCode == 39) { // Arrow right
                        $(this.el).find('.pay').click()
                        keyAccept = true
                    }
                    if (event.keyCode == 38 || event.keyCode == 40) { // arrow up and down
                        if (selecteLine) {
                            for (let i = 0; i < selectedOrder.orderlines.models.length; i++) {
                                let line = selectedOrder.orderlines.models[i]
                                if (line.cid == selecteLine.cid) {
                                    let line_number = null;
                                    if (event.keyCode == 38) { // up
                                        if (i == 0) {
                                            line_number = selectedOrder.orderlines.models.length - 1
                                        } else {
                                            line_number = i - 1
                                        }
                                    } else { // down
                                        if (i + 1 >= selectedOrder.orderlines.models.length) {
                                            line_number = 0
                                        } else {
                                            line_number = i + 1
                                        }
                                    }
                                    selectedOrder.select_orderline(selectedOrder.orderlines.models[line_number])
                                }
                            }
                        }
                        keyAccept = true
                    }
                    // if (event.keyCode == 65) { // a : search client
                    //     $('.search-customer >input').focus()
                    //     keyAccept = true
                    // }
                    if (event.keyCode == 67) { // c
                        $(this.el).find('.set-customer').click()
                        keyAccept = true
                    }
                    if (event.keyCode == 68) { // d
                        this.trigger('set-numpad-mode', {mode: 'discount'});
                        keyAccept = true
                    }
                    if (event.keyCode == 72) { // h
                        $(this.el).find('.clear-icon').click()
                        keyAccept = true
                    }
                    if (event.keyCode == 76) { // l (logout)
                        $('.lock-button').click()
                        keyAccept = true
                    }
                    if (event.keyCode == 80) { // p
                        this.trigger('set-numpad-mode', {mode: 'price'});
                        keyAccept = true
                    }
                    if (event.keyCode == 81) { // q
                        this.trigger('set-numpad-mode', {mode: 'quantity'});
                        keyAccept = true
                    }
                    if (event.keyCode == 83) { // s : search product
                        $('.search >input')[0].focus()
                        keyAccept = true
                    }
                    if (event.keyCode == 187 && selecteLine) { // +
                        selecteLine.set_quantity(selecteLine.quantity + 1)
                        keyAccept = true
                    }
                    if (event.keyCode == 189 && selecteLine) { // -
                        let newQty = selecteLine.quantity - 1
                        setTimeout(function () {
                            selecteLine.set_quantity(newQty)
                        }, 200) // odoo core set to 0, i waiting 1/5 second set back -1
                        keyAccept = true
                    }
                    if (event.keyCode == 112) { // F1
                        $(this.el).find('.o_pricelist_button').click()
                        keyAccept = true
                    }
                    if (event.keyCode == 113) { // F2
                        $('.invoice-button').click()
                        keyAccept = true
                    }
                    if (event.keyCode == 114) { // F3: to invoice
                        keyAccept = true
                        $('.clear-items-button').click()
                    }
                    if (event.keyCode == 115) { // F4 : return mode
                        keyAccept = true
                        $('.return-mode-button').click()
                    }
                    if ((event.keyCode == 117 || event.keyCode == 82) && this.env.pos.config.review_receipt_before_paid) { // F6 or R: receipt
                        keyAccept = true
                        $('.print-receipt-button').click()
                    }
                    if (event.keyCode == 118) { // F7: set note
                        keyAccept = true
                        $('.set-note-button').click()
                    }
                    if (event.keyCode == 119) { // F8: set note
                        keyAccept = true
                        $('.set-service-button').click()
                    }
                    if (event.keyCode == 120) { // F9
                        keyAccept = true
                        $('.orders-header-button').click()
                    }
                    if (event.keyCode == 121) { // F10
                        keyAccept = true
                        $('.sale-orders-header-button').click()
                    }
                    if (event.keyCode == 122) { // F11
                        keyAccept = true
                        $('.pos-orders-header-button').click()
                    }
                    if (event.keyCode == 123) { // F12
                        keyAccept = true
                        $('.invoices-header-button').click()
                    }

                    if (!keyAccept && !["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "l", ".", "+", "-", "-", "=", "F1", "F2", "F3", "F4", "F6", "F7", "F8", "F9", "F10", "F11", "F12", " "].includes(event.key)) {
                        $('.search >input').focus()
                        if (event.key.length == 1) {
                            $('.search >input').val(event.key)
                        }
                    }
                }
                this.buffered_key_events = [];
            }

            async _barcodeErrorAction(code) {
                const codeScan = code.code
                console.warn('[_barcodeErrorAction] code: ' + codeScan)
                const selectedOrder = this.env.pos.get_order()
                if (selectedOrder) {
                    let modelScan = await this.env.pos.scan_product(code)
                    if (!modelScan) {
                        const appliedCoupon = await this.env.pos.getInformationCouponPromotionOfCode(codeScan);
                        if (!appliedCoupon && !this.env.pos.scanDirectCamera) {
                            super._barcodeErrorAction(code)
                        }
                    }
                } else {
                    if (!this.env.pos.scanDirectCamera) {
                        super._barcodeErrorAction(code)
                    }
                }
            }

            async _validateMode(mode) {
                if (mode == 'discount' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_discount || !this.env.pos.config.manual_discount)) {
                    this.env.pos.alert_message({
                        title: this.env._t('Alert'),
                        body: this.env._t('You have not Permission change Discount')
                    })
                    return false;
                }
                if (mode == 'quantity' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_qty)) {
                    this.env.pos.alert_message({
                        title: this.env._t('Alert'),
                        body: this.env._t('You have not Permission change Quantity')
                    })
                    return false;
                }
                if (mode == 'price' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_price)) {
                    this.env.pos.alert_message({
                        title: this.env._t('Alert'),
                        body: this.env._t('You have not Permission change Quantity')
                    })
                    return false;
                }
                if (this.env.pos.config.validate_quantity_change && mode == 'quantity') {
                    let validate = await this.env.pos._validate_action(this.env._t('Change Quantity of Line.'));
                    if (!validate) {
                        return false;
                    }
                }
                if (this.env.pos.config.validate_price_change && mode == 'price') {
                    let validate = await this.env.pos._validate_action(this.env._t('Change Price of Line.'));
                    if (!validate) {
                        return false;
                    }
                }
                if (this.env.pos.config.validate_discount_change && mode == 'discount') {
                    let validate = await this.env.pos._validate_action(this.env._t('Change Discount of Line.'));
                    if (!validate) {
                        return false;
                    }
                }
                return true
            }

            async _setNumpadMode(event) {
                const {mode} = event.detail;
                const validate = await this._validateMode(mode)
                if (validate) {
                    this.env.pos.alert_message({
                        title: this.env._t('Mode change'),
                        body: mode
                    })
                    return await super._setNumpadMode(event)
                }
            }

            async autoAskPaymentMethod() {
                const selectedOrder = this.env.pos.get_order();
                if (selectedOrder.is_return) {
                    return this.showScreen('PaymentScreen')
                }
                if (selectedOrder.is_to_invoice() && !selectedOrder.get_client()) {
                    this.showPopup('ConfirmPopup', {
                        title: this.env._t('Warning'),
                        body: this.env._t('Order will process to Invoice, please select one Customer for set to current Order'),
                        disableCancelButton: true,
                    })
                    const {confirmed, payload: newClient} = await this.showTempScreen(
                        'ClientListScreen',
                        {client: null}
                    );
                    if (confirmed) {
                        selectedOrder.set_client(newClient);
                    } else {
                        return this.autoAskPaymentMethod()
                    }
                }
                if (selectedOrder && (selectedOrder.paymentlines.length == 0 || (selectedOrder.paymentlines.length == 1 && selectedOrder.paymentlines.models[0].payment_method.pos_method_type == 'rounding'))) {
                    const paymentMethods = this.env.pos.normal_payment_methods.map(m => {
                        if (m.journal && m.journal.currency_id) {
                            return {
                                id: m.id,
                                item: m,
                                name: m.name + ' (' + m.journal.currency_id[1] + ' ) '
                            }
                        } else {
                            return {
                                id: m.id,
                                item: m,
                                name: m.name
                            }
                        }
                    })
                    let {confirmed, payload: selectedItems} = await this.showPopup(
                        'PopUpSelectionBox',
                        {
                            title: this.env._t('Select the Payment Method. If you need add Multi Payment Lines, please click [Close] button for go to Payment Screen to do it.'),
                            items: paymentMethods,
                            onlySelectOne: true,
                            buttonMaxSize: true
                        }
                    );
                    if (confirmed) {
                        const paymentMethodSelected = selectedItems.items[0]
                        if (!paymentMethodSelected) {
                            this.env.pos.alert_message({
                                title: this.env._t('Error'),
                                body: this.env._t('Please select one Payment Method')
                            })
                            return this.autoAskPaymentMethod()
                        }
                        selectedOrder.add_paymentline(paymentMethodSelected);
                        const paymentline = selectedOrder.selected_paymentline;
                        paymentline.set_amount(0)
                        let {confirmed, payload: amount} = await this.showPopup('NumberPopup', {
                            title: this.env._t('How much Amount customer give ? Amount Total with taxes of Order is: ') + this.env.pos.format_currency(selectedOrder.get_total_with_tax()),
                            body: this.env._t('Full fill due Amount, you can click to Button Validate Order for finish Order and get a Receipt !'),
                            activeFullFill: true,
                            confirmFullFillButtonText: this.env._t('Full Fill Amount: ') + this.env.pos.format_currency(selectedOrder.get_due()),
                            fullFillAmount: selectedOrder.get_due()
                        })
                        if (confirmed) {
                            paymentline.set_amount(amount);
                            if (selectedOrder.get_due() <= 0) {
                                let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                                    title: this.env._t('Refund Amount of Order : ') + this.env.pos.format_currency(-selectedOrder.get_due()),
                                    body: this.env._t('Click Submit button for finish the Order and print Receipt ? (Shortcut key: [Enter])'),
                                    cancelText: this.env._t('No. Close Popup'),
                                    confirmText: this.env._t('Submit')
                                })
                                if (confirmed) {
                                    this.showScreen('PaymentScreen', {
                                        autoValidateOrder: true,
                                        isShown: false,
                                    })
                                } else {
                                    this.showScreen('PaymentScreen')
                                }
                            } else {
                                this.showScreen('PaymentScreen')
                                return this.env.pos.alert_message({
                                    title: this.env._t('Warning'),
                                    body: this.env._t('Order not full fill Amount Total need to paid, Remaining Amount: ') + this.env.pos.format_currency(selectedOrder.get_due())
                                })
                            }
                        } else {
                            this.showScreen('PaymentScreen')
                        }
                    } else {
                        this.showScreen('PaymentScreen')
                    }
                } else {
                    this.showScreen('PaymentScreen')
                }
            }

            async _onClickPay() {
                let selectedOrder = this.env.pos.get_order();
                if (this.env.pos.couponProgramsAutomatic && this.env.pos.config.coupon_program_apply_type == 'auto') {
                    this.env.pos.automaticSetCoupon()
                }
                let hasValidMinMaxPrice = selectedOrder.isValidMinMaxPrice()
                if (!hasValidMinMaxPrice) {
                    return true
                }
                if (selectedOrder.is_to_invoice() && !selectedOrder.get_client()) {
                    const currentClient = selectedOrder.get_client();
                    const {confirmed, payload: newClient} = await this.showTempScreen(
                        'ClientListScreen',
                        {client: currentClient}
                    );
                    if (confirmed) {
                        selectedOrder.set_client(newClient);
                        selectedOrder.updatePricelist(newClient);
                    } else {
                        return this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'),
                            body: this.env._t('Order to Invoice, Required Set Customer'),
                        })
                    }
                }
                if (selectedOrder.orderlines.length == 0) {
                    return this.showPopup('ErrorPopup', {
                        title: this.env._t('Error'),
                        body: this.env._t('Your Order is Blank Cart Items'),
                    })
                }
                if (selectedOrder && selectedOrder.get_total_with_tax() == 0) {
                    this.env.pos.alert_message({
                        title: this.env._t('Warning !!!'),
                        body: this.env._t('Total Amount of Order is : ') + this.env.pos.format_currency(0)
                    })
                }
                if (this.env.session.restaurant_order) {
                    if (!this.env.pos.first_order_succeed) {
                        const selectedOrder = this.env.pos.get_order()
                        let {confirmed, payload: guest_total} = await this.showPopup('NumberPopup', {
                            title: this.env._t('How many guests on your table ?'),
                            startingValue: 0
                        })
                        if (confirmed) {
                            selectedOrder.set_customer_count(parseInt(guest_total))
                        } else {
                            return this.showScreen('ProductScreen')
                        }
                    }
                    let {confirmed, payload: note} = await this.showPopup('TextAreaPopup', {
                        title: this.env._t('Have any notes for Cashiers/Kitchen Room of Restaurant ?'),
                    })
                    if (confirmed) {
                        if (note) {
                            selectedOrder.set_note(note)
                        }
                    }
                    if (selectedOrder.get_allow_sync()) {
                        let orderJson = selectedOrder.export_as_JSON()
                        orderJson.state = 'Waiting'
                        this.env.session.restaurant_order = false
                        this.env.pos.pos_bus.send_notification({
                            data: orderJson,
                            action: 'new_qrcode_order',
                            order_uid: selectedOrder.uid,
                        });
                        this.env.session.restaurant_order = true
                    } else {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'),
                            body: this.env._t('POS missed setting Sync Between Sessions. Please contact your admin resolve it')
                        })
                    }
                    this.env.pos.config.login_required = false // todo: no need login when place order more items
                    this.env.pos.first_order_succeed = true
                    this.env.pos.placed_order = selectedOrder
                    return this.showTempScreen('RegisterScreen', {
                        selectedOrder: selectedOrder
                    })
                } else {
                    if (this.env.pos.config.rounding_automatic) {
                        this.roundingTotalAmount()
                    }
                    if (!this.env.pos.config.allow_order_out_of_stock) {
                        const quantitiesByProduct = selectedOrder.product_quantity_by_product_id()
                        let isValidStockAllLines = true;
                        for (let n = 0; n < selectedOrder.orderlines.models.length; n++) {
                            let l = selectedOrder.orderlines.models[n];
                            let currentStockInCart = quantitiesByProduct[l.product.id]
                            if (l.product.type == 'product' && l.product.qty_available < currentStockInCart) {
                                isValidStockAllLines = false
                                this.env.pos.alert_message({
                                    title: this.env._t('Error'),
                                    body: l.product.display_name + this.env._t(' not enough for sale. Current stock on hand only have: ') + l.product.qty_available + this.env._t(' . Your cart add ') + currentStockInCart + this.env._t(' (items). Bigger than stock on hand have of Product !!!'),
                                    timer: 10000
                                })
                            }
                        }
                        if (!isValidStockAllLines) {
                            return false;
                        }
                    }
                }
                posbus.trigger('set-screen', 'Payment') // single screen
                // if (this.env.isMobile) {
                //     this.autoAskPaymentMethod()
                // } else {
                //
                // }
                //super._onClickPay() // this.showScreen('PaymentScreen');
            }


            async _onClickCustomer() { // single screen
                this.env.pos.syncProductsPartners()
                if (this.env.isMobile) {
                    super._onClickCustomer()
                } else {
                    posbus.trigger('set-screen', 'Clients') // single screen
                    setTimeout(function () {
                        $('.searchbox-client >input').focus()
                    }, 200)
                }
            }

            async updateStockEachLocation(product) {
                if (product.tracking == 'serial') {
                    return this.env.pos.alert_message({
                        title: this.env._t('Warning'),
                        body: product.display_name + this.env._t(' tracking By Unique Serial, not allow you re-update stock quantities')
                    })
                } else {
                    let stock_location_ids = this.env.pos.get_all_source_locations();
                    let stock_datas = await this.env.pos._get_stock_on_hand_by_location_ids([product.id], stock_location_ids).then(function (datas) {
                        return datas
                    });
                    if (stock_datas) {
                        let items = [];
                        let withLot = false
                        if (product.tracking == 'lot') {
                            withLot = true
                        }
                        if (!withLot) {
                            for (let location_id in stock_datas) {
                                let location = this.env.pos.stock_location_by_id[location_id];
                                if (location) {
                                    items.push({
                                        id: location.id,
                                        item: location,
                                        location_id: location.id,
                                        quantity: stock_datas[location_id][product.id]
                                    })
                                }
                            }
                        } else {
                            let stockQuants = await this.rpc({
                                model: 'stock.quant',
                                method: 'search_read',
                                domain: [['product_id', '=', product.id], ['location_id', 'in', stock_location_ids]],
                                fields: [],
                                context: {
                                    limit: 1
                                }
                            })
                            if (stockQuants) {
                                items = stockQuants.map((q) => ({
                                    id: q.id,
                                    item: q,
                                    lot_id: q.lot_id[0],
                                    lot_name: q.lot_id[1],
                                    location_id: q.location_id[0],
                                    location_name: q.location_id[1],
                                    quantity: q.quantity
                                }));
                            }
                        }
                        if (items.length) {
                            let {confirmed, payload: result} = await this.showPopup('UpdateStockOnHand', {
                                title: this.env._t('Summary Stock on Hand (Available - Reserved) each Stock Location of [ ') + product.display_name + ' ]',
                                withLot: withLot,
                                array: items,
                            })
                            if (confirmed) {
                                const newStockArray = result.newArray

                                for (let i = 0; i < newStockArray.length; i++) {
                                    let newStock = newStockArray[i];
                                    if (!withLot) {
                                        await this.rpc({
                                            model: 'stock.location',
                                            method: 'pos_update_stock_on_hand_by_location_id',
                                            args: [newStock['location_id'], {
                                                product_id: product.id,
                                                product_tmpl_id: product.product_tmpl_id,
                                                quantity: parseFloat(newStock['quantity']),
                                                location_id: newStock['location_id']
                                            }],
                                            context: {}
                                        }, {
                                            shadow: true,
                                            timeout: 65000
                                        })
                                    } else {
                                        await this.rpc({
                                            model: 'stock.quant',
                                            method: 'write',
                                            args: [newStock['id'], {
                                                quantity: parseFloat(newStock['quantity']),
                                            }],
                                            context: {}
                                        }, {
                                            shadow: true,
                                            timeout: 65000
                                        })
                                    }
                                }
                                this.env.pos.trigger('reload.quantity.available')
                                this.env.pos.alert_message({
                                    title: product.display_name,
                                    body: this.env._t('Successfully update stock on hand'),
                                    color: 'success'
                                })
                                return this.updateStockEachLocation(product)
                            }
                        } else {
                            return this.env.pos.alert_message({
                                title: this.env._t('Warning'),
                                body: product.display_name + this.env._t(' not found stock on hand !!!')
                            })
                        }
                    }
                }
            }

            async _clickProduct(event) {
                const self = this;
                const selectedOrder = this.env.pos.get_order();
                const product = event.detail;
                if (this.env.pos.config.fullfill_lots && ['serial', 'lot'].includes(event.detail.tracking)) {
                    let draftPackLotLines
                    let packLotLinesToEdit = await this.rpc({
                        model: 'stock.production.lot',
                        method: 'search_read',
                        domain: [['product_id', '=', event.detail.id]],
                        fields: []
                    }).then(function (value) {
                        return value
                    }, function (error) {
                        self.env.pos.query_backend_fail(error)
                        return false
                    })
                    if (!packLotLinesToEdit) {
                        packLotLinesToEdit = this.env.pos.lots.filter(l => l.product_id && l.product_id[0] == product['id'])
                    }
                    if (packLotLinesToEdit && packLotLinesToEdit.length) {
                        packLotLinesToEdit.forEach((l) => l.text = l.name);
                        const lotList = packLotLinesToEdit.map(l => ({
                            id: l.id,
                            item: l,
                            label: l.name + this.env._t(' On Hand Available is: ') + l.product_qty + this.env._t(', and Expiration Date: ') + (l.expiration_date || 'N/A')
                        }))
                        let {confirmed, payload: selectedLot} = await this.showPopup(
                            'SelectionPopup',
                            {
                                title: this.env._t('Assign Lot/Serial for: ') + product.display_name + this.env._t('. If you need Manual input, please click Cancel button'),
                                list: lotList,
                            }
                        );
                        if (confirmed && selectedLot) {
                            const newPackLotLines = [selectedLot]
                                .filter(item => item.id)
                                .map(item => ({lot_name: item.name}));
                            const modifiedPackLotLines = [selectedLot]
                                .filter(item => !item.id)
                                .map(item => ({lot_name: item.text}));

                            draftPackLotLines = {modifiedPackLotLines, newPackLotLines};
                            if (newPackLotLines.length != 1) {
                                return this.env.pos.alert_message({
                                    title: this.env._t('Error'),
                                    body: this.env._t('Please select only Lot, and remove another Lots')
                                })
                            }
                            const lotName = selectedLot['name']
                            return selectedOrder.add_product(event.detail, {
                                draftPackLotLines,
                                // description: this.env._t('Lot: ') + lotName,
                                price_extra: 0,
                                quantity: 1,
                            });
                        } else {
                            const {confirmed, payload} = await this.showPopup('EditListPopup', {
                                title: this.env._t('Lot/Serial Number(s) Required'),
                                isSingleItem: false,
                                array: packLotLinesToEdit,
                            });
                            if (confirmed) {
                                const newPackLotLines = payload.newArray
                                    .filter(item => item.id)
                                    .map(item => ({lot_name: item.name}));
                                const modifiedPackLotLines = payload.newArray
                                    .filter(item => !item.id)
                                    .map(item => ({lot_name: item.text}));

                                draftPackLotLines = {modifiedPackLotLines, newPackLotLines};
                                if (newPackLotLines.length != 1) {
                                    return this.env.pos.alert_message({
                                        title: this.env._t('Error'),
                                        body: this.env._t('Please select only Lot, and remove another Lots')
                                    })
                                }
                                const lotName = newPackLotLines[0]['lot_name']
                                return selectedOrder.add_product(event.detail, {
                                    draftPackLotLines,
                                    // description: this.env._t('Lot: ') + lotName,
                                    price_extra: 0,
                                    quantity: 1,
                                });
                            }
                        }
                    }
                }
                await super._clickProduct(event)
                const selectedLine = selectedOrder.get_selected_orderline();
                if (!selectedLine) {
                    return;
                }
                if (product.multi_variant && this.env.pos.variant_by_product_tmpl_id[product.product_tmpl_id]) {
                    let variants = this.env.pos.variant_by_product_tmpl_id[product.product_tmpl_id];
                    let {confirmed, payload: results} = await this.showPopup('PopUpSelectionBox', {
                        title: this.env._t('Select Variants and Values'),
                        items: variants
                    })
                    if (confirmed) {
                        let variantIds = results.items.map((i) => (i.id))
                        selectedLine.set_variants(variantIds);
                    }
                }
                if (product.cross_selling && this.env.pos.cross_items_by_product_tmpl_id[product.product_tmpl_id]) {
                    let crossItems = this.env.pos.cross_items_by_product_tmpl_id[product.product_tmpl_id];
                    let {confirmed, payload: results} = await this.showPopup('PopUpSelectionBox', {
                        title: this.env._t('Suggest buy more Products with ' + product.display_name),
                        items: crossItems
                    })
                    if (confirmed) {
                        let selectedCrossItems = results.items;
                        for (let index in selectedCrossItems) {
                            let item = selectedCrossItems[index];
                            let product = this.env.pos.db.get_product_by_id(item['product_id'][0]);
                            if (product) {
                                if (!product) {
                                    continue
                                }
                                var price = item['list_price'];
                                var discount = 0;
                                if (item['discount_type'] == 'fixed') {
                                    price = price - item['discount']
                                }
                                if (item['discount_type'] == 'percent') {
                                    discount = item['discount']
                                }
                                selectedOrder.add_product(product, {
                                    quantity: item['quantity'],
                                    price: price,
                                    merge: false,
                                });
                                if (discount > 0) {
                                    selectedOrder.get_selected_orderline().set_discount(discount)
                                }
                            }
                        }
                    }
                }
                if (product.sale_with_package && this.env.pos.packaging_by_product_id[product.id]) {
                    var packagings = this.env.pos.packaging_by_product_id[product.id];
                    let packList = packagings.map((p) => ({
                        id: p.id,
                        item: p,
                        label: p.name + this.env._t(' : have Contained quantity ') + p.qty + this.env._t(' with sale price ') + this.env.pos.format_currency(p.list_price)
                    }))
                    let {confirmed, payload: packSelected} = await this.showPopup('SelectionPopup', {
                        title: this.env._t('Select sale from Packaging'),
                        list: packList
                    })
                    if (confirmed) {
                        selectedLine.packaging = packSelected;
                        selectedLine.set_quantity(packSelected.qty, 'set quantity manual via packing');
                        if (packSelected.list_price > 0) {
                            selectedLine.set_unit_price(packSelected.list_price / packSelected.qty);
                        }

                    }
                }
                let combo_items = this.env.pos.combo_items.filter((c) => selectedLine.product.product_tmpl_id == c.product_combo_id[0])
                if (combo_items && combo_items.length > 0) {
                    selectedOrder.setBundlePackItems()
                }
            }

            roundingTotalAmount() {
                let selectedOrder = this.env.pos.get_order();
                let roundingMethod = this.env.pos.payment_methods.find((p) => p.journal && p.pos_method_type == 'rounding')
                if (!selectedOrder || !roundingMethod) {
                    return this.env.pos.alert_message({
                        title: this.env._t('Warning'),
                        body: this.env._t('You active Rounding on POS Setting but your POS Payment Method missed add Payment Method Rounding'),
                    })
                }
                selectedOrder.paymentlines.models.forEach(function (p) {
                    if (p.payment_method && p.payment_method.journal && p.payment_method.pos_method_type == 'rounding') {
                        selectedOrder.remove_paymentline(p)
                    }
                })
                let due = selectedOrder.get_due();
                let amountRound = 0;
                if (this.env.pos.config.rounding_type == 'rounding_integer') {
                    let decimal_amount = due - Math.floor(due);
                    if (decimal_amount <= 0.25) {
                        amountRound = -decimal_amount
                    } else if (decimal_amount > 0.25 && decimal_amount < 0.75) {
                        amountRound = 1 - decimal_amount - 0.5;
                        amountRound = 0.5 - decimal_amount;
                    } else if (decimal_amount >= 0.75) {
                        amountRound = 1 - decimal_amount
                    }
                } else {
                    let after_round = Math.round(due * Math.pow(10, roundingMethod.journal.decimal_rounding)) / Math.pow(10, roundingMethod.journal.decimal_rounding);
                    amountRound = after_round - due;
                }
                if (amountRound == 0) {
                    return true;
                }
                selectedOrder.add_paymentline(roundingMethod);
                let roundedPaymentLine = selectedOrder.selected_paymentline;
                roundedPaymentLine.set_amount(-amountRound);
            }

        }
    Registries.Component.extend(ProductScreen, RetailProductScreen);

    return RetailProductScreen;
});
