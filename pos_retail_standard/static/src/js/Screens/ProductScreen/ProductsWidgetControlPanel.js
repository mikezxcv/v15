odoo.define('pos_retail_standard.ProductsWidgetControlPanel', function (require) {
    'use strict';

    const ProductsWidgetControlPanel = require('point_of_sale.ProductsWidgetControlPanel');
    const {useState} = owl.hooks;
    const {useListener} = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');

    const RetailProductsWidgetControlPanel = (ProductsWidgetControlPanel) =>
        class extends ProductsWidgetControlPanel {
            constructor() {
                super(...arguments);
                useListener('filter-selected', this._onFilterSelected);
                useListener('search', this._onSearch);
                useListener('clear-search-product-filter', this.clearFilter);
                this.state = useState({
                    activeExtendFilter: false,
                    activeAllCategories: true,
                });
                if (this.env.isMobile) {
                    this.state.activeAllCategories = false
                }
                this.searchDetails = {};
                this.filter = null;
                this._initializeSearchFieldConstants();
                this.sepecialFilter = [
                    this.env._t('All Items'),
                    this.env._t('[Only] Out of Stock'),
                    this.env._t('[Only] Available in Stock'),
                    this.env._t('[Only] Tracking by Lot/Serial'),
                    this.env._t('[Only] Bundle Pack/Combo'),
                    this.env._t('[Only] Included Add-ons Items'),
                    this.env._t('[Only] Multi Variant'),
                    this.env._t('[Only] Multi Unit'),
                    this.env._t('[Only] Multi Barcode'),
                ]
            }

            get rootCategoryNotSelected() {
                let selectedCategoryId = this.env.pos.get('selectedCategoryId')
                if (selectedCategoryId == 0) {search-word-input
                    return true
                } else {
                    return false
                }
            }

            get Categories() {
                const allCategories = this.env.pos.db.category_by_id
                let categories = []
                for (let index in allCategories) {
                    categories.push(allCategories[index])
                }
                return categories
            }

            async UpdateTheme() {
                await this.showPopup('PopUpUpdateTheme', {
                    title: this.env._t('Modifiers POS Screen/Theme'),
                })
            }

            showExtendSearch() {
                this.state.activeExtendFilter = !this.state.activeExtendFilter
            }

            async reloadMasterData() {
                await this.env.pos.syncProductsPartners()
                if (this.env.pos.config.pos_orders_management) {
                    await this.env.pos.getPosOrders();
                }
                const coupon_model = this.env.pos.models.find(m => m.model == 'coupon.coupon')
                if (coupon_model) {
                    await this.env.pos.load_server_data_by_model(coupon_model)
                }
                const pricelist_model = this.env.pos.models.find(m => m.model == 'product.pricelist')
                if (pricelist_model) {
                    await this.env.pos.load_server_data_by_model(pricelist_model)
                    this.env.pos.getProductPricelistItems()
                }
            }

            async setLimitedProductsDisplayed() {
                const {confirmed, payload: number} = await this.showPopup('NumberPopup', {
                    title: this.env._t('How many Products need Display on Products Screen'),
                    startingValue: this.env.pos.db.limit,
                })
                if (confirmed) {
                    if (number > 0) {
                        if (number > 1000) {
                            return this.showPopup('ErrorPopup', {
                                title: this.env._t('Warning'),
                                body: this.env._t('Maximum can set is 1000')
                            })
                        } else {
                            this.env.pos.db.limit = number
                            this.env.qweb.forceUpdate();
                        }
                    } else {
                        this.env.pos.alert_message({
                            title: this.env._t('Warning'),
                            body: this.env._t('Required number bigger than 0')
                        })
                    }
                }
            }

            async addCategory() {
                let {confirmed, payload: results} = await this.showPopup('PopUpCreateCategory', {
                    title: this.env._t('Create new Category')
                })
                if (confirmed && results['name']) {
                    let value = {
                        name: results.name,
                        sequence: results.sequence
                    }
                    if (results.parent_id != 'null') {
                        value['parent_id'] = results['parent_id']
                    }
                    if (results.image_128) {
                        value['image_128'] = results.image_128.split(',')[1];
                    }
                    let category_id = await this.rpc({
                        model: 'pos.category',
                        method: 'create',
                        args: [value]
                    })
                    let newCategories = await this.rpc({
                        model: 'pos.category',
                        method: 'search_read',
                        args: [[['id', '=', category_id]]],
                    })
                    const pos_categ_model = this.env.pos.get_model('pos.category');
                    if (pos_categ_model) {
                        pos_categ_model.loaded(this.env.pos, newCategories, {});
                    }
                    this.render()
                    await this.reloadMasterData()
                    this.showPopup('ConfirmPopup', {
                        title: this.env._t('Successfully'),
                        body: this.env._t('New POS Category just created, and append to your POS Category list'),
                        disableCancelButton: true,
                    })
                } else {
                    return this.env.pos.alert_message({
                        title: this.env._t('Error'),
                        body: this.env._t('Category Name is required')
                    })
                }
            }

            async addProduct() {
                let {confirmed, payload: results} = await this.showPopup('PopUpCreateProduct', {
                    title: this.env._t('Create new Product')
                })
                if (confirmed && results) {
                    let value = {
                        name: results.name,
                        list_price: results.list_price,
                        default_code: results.default_code,
                        barcode: results.barcode,
                        standard_price: results.standard_price,
                        type: results.type,
                        available_in_pos: true
                    }
                    if (results.pos_categ_id != 'null') {
                        value['pos_categ_id'] = results['pos_categ_id']
                    }
                    if (results.product_brand_id != 'null') {
                        value['product_brand_id'] = parseInt(results['product_brand_id'])
                    } else {
                        value['product_brand_id'] = null
                    }
                    if (results.image_1920) {
                        value['image_1920'] = results.image_1920.split(',')[1];
                    }
                    await this.rpc({
                        model: 'product.product',
                        method: 'create',
                        args: [value]
                    })
                    await this.reloadMasterData()
                    this.env.pos.alert_message({
                        title: results.name,
                        body: this.env._t('Added to Products Screen now !!!'),
                        color: 'success'
                    })
                }
            }

            async actionReloadMasterData() {
                this.trigger('switch-category', 0);
                await this.reloadMasterData()
                this.env.pos.alert_message({
                    title: this.env._t('Successfully'),
                    body: this.env._t('Products, Customers, Pricelists, POS Orders, Coupons sync with backend now !!!'),
                    color: 'success'
                })
            }


            get isActiveShowGuideKeyboard() {
                return this.env.isShowKeyBoard
            }

            async showKeyBoardGuide() {
                this.env.isShowKeyBoard = !this.env.isShowKeyBoard;
                this.env.qweb.forceUpdate();
                return this.showPopup('ConfirmPopup', {
                    title: this.env._t('Tip !!!'),
                    body: this.env._t('Press any key to Your Keyboard, POS Screen auto focus Your Mouse to Search Products Box. Type something to Search Box => Press to [Tab] and => Press to Arrow Left/Right for select a Product. => Press to Enter for add Product to Cart'),
                    disableCancelButton: true,
                })
            }

            async getProductsTopSelling() {
                const {confirmed, payload: number} = await this.showPopup('NumberPopup', {
                    title: this.env._t('How many Products top Selling you need to show ?'),
                    startingValue: 10,
                })
                if (confirmed) {
                    const productsTopSelling = await this.rpc({
                        model: 'pos.order',
                        method: 'getTopSellingProduct',
                        args: [[], parseInt(number)],
                    })
                    let search_extends_results = []
                    this.env.pos.productsTopSelling = {}
                    if (productsTopSelling.length > 0) {
                        for (let index in productsTopSelling) {
                            let product_id = productsTopSelling[index][0]
                            let qty_sold = productsTopSelling[index][1]
                            this.env.pos.productsTopSelling[product_id] = qty_sold
                            let product = this.env.pos.db.get_product_by_id(product_id);
                            if (product) {
                                search_extends_results.push(product)
                            }
                        }
                    }
                    if (search_extends_results.length > 0) {
                        this.env.pos.set('search_extends_results', search_extends_results)
                        posbus.trigger('reload-products-screen')
                        posbus.trigger('remove-filter-attribute')
                    }
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

            async adNewCustomer() {
                let {confirmed, payload: results} = await this.showPopup('PopUpCreateCustomer', {
                    title: this.env._t('Create New Customer'),
                    mobile: ''
                })
                if (confirmed) {
                    if (results.error) {
                        return this.env.pos.alert_message({
                            title: this.env._t('Error'),
                            body: results.error
                        })
                    }
                    const partnerValue = {
                        'name': results.name,
                    }
                    if (results.image_1920) {
                        partnerValue['image_1920'] = results.image_1920.split(',')[1]
                    }
                    if (results.title) {
                        partnerValue['title'] = results.title
                    }
                    if (!results.title && this.env.pos.partner_titles) {
                        partnerValue['title'] = this.env.pos.partner_titles[0]['id']
                    }
                    if (results.street) {
                        partnerValue['street'] = results.street
                    }
                    if (results.city) {
                        partnerValue['city'] = results.city
                    }
                    if (results.street) {
                        partnerValue['street'] = results.street
                    }
                    if (results.phone) {
                        partnerValue['phone'] = results.phone
                    }
                    if (results.mobile) {
                        partnerValue['mobile'] = results.mobile
                    }

                    if (results.birthday_date) {
                        partnerValue['birthday_date'] = results.birthday_date
                    }
                    if (results.barcode) {
                        partnerValue['barcode'] = results.barcode
                    }
                    if (results.comment) {
                        partnerValue['comment'] = results.comment
                    }
                    if (results.property_product_pricelist) {
                        partnerValue['property_product_pricelist'] = results.property_product_pricelist
                    } else {
                        partnerValue['property_product_pricelist'] = this.env.pos.pricelists[0].id
                    }
                    if (results.country_id) {
                        partnerValue['country_id'] = results.country_id
                    }
                    let partner_id = await this.rpc({
                        model: 'res.partner',
                        method: 'create',
                        args: [partnerValue],
                        context: {}
                    })
                    await this.reloadMasterData()
                    const partner = this.env.pos.db.partner_by_id[partner_id]
                    this.env.pos.get_order().set_client(partner)

                }
            }

            // suggestProducts() {
            //     const self = this;
            //     var sources = this.env.pos.db.get_products_source();
            //     $('.search >input').autocomplete({
            //         source: sources,
            //         minLength: 3,
            //         select: function (event, ui) {
            //             const selectedOrder = self.env.pos.get_order()
            //             if (ui && ui['item'] && ui['item']['value']) {
            //                 var product = self.env.pos.db.get_product_by_id(ui['item']['value']);
            //                 if (product) {
            //                     selectedOrder.add_product(product)
            //                     setTimeout(() => {
            //                         self.clearSearch()
            //                     }, 200)
            //                 }
            //             }
            //         }
            //     });
            // }

            clearSearch() {
                this.env.pos.set('search_extends_results', null)
                this.searchDetails = {};
                super.clearSearch()
                posbus.trigger('reload-products-screen')
                posbus.trigger('remove-filter-attribute')
            }

            clearFilter() {
                this.env.pos.set('search_extends_results', null)
                this.searchDetails = {};
                posbus.trigger('reload-products-screen')
                posbus.trigger('remove-filter-attribute')
                this.render()
            }

            // TODO: ==================== Search bar example ====================
            get searchBarConfig() {
                return {
                    searchFields: this.constants.searchFieldNames,
                    filter: {show: true, options: this.filterOptions},
                };
            }

            // TODO: define search fields
            get _searchFields() {
                var fields = {
                    'Any String': (product) => product.search_extend,
                    'Product Name': (product) => product.name,
                    'Ref (Default Code) ': (product) => product.default_code,
                    'Barcode': (product) => product.barcode,
                    'Supplier Code': (product) => product.supplier_barcode,
                    'Price is': (product) => product.lst_price,
                    'Sale Category': (product) => product.categ_id[1],
                    'Internal Notes': (product) => product.description,
                    'Description Sale': (product) => product.description_sale,
                    'Description Picking': (product) => product.description_picking,
                    ID: (product) => product.id,
                };
                return fields;
            }

            get filterOptions() {
                return this.sepecialFilter
            }

            get _stateSelectionFilter() {
                return {}
            }

            _initializeSearchFieldConstants() {
                this.constants = {};
                Object.assign(this.constants, {
                    searchFieldNames: Object.keys(this._searchFields),
                    stateSelectionFilter: this._stateSelectionFilter,
                });
            }

            _onFilterSelected(event) {
                this.filter = event.detail.filter;
                this._autoComplete()
            }

            _onSearch(event) {
                const searchDetails = event.detail;
                Object.assign(this.searchDetails, searchDetails);
                this._autoComplete()
            }

            _autoComplete() {
                const filterCheck = (product) => {
                    if (this.filter && !this.sepecialFilter.includes(this.filter)) {
                        if (product.pos_categ_id) {
                            const pos_category_id = product.pos_categ_id[0];
                            const isTheSameCategory = this.filter === this.constants.stateSelectionFilter[pos_category_id]
                            return isTheSameCategory;
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 1) {
                        if (product.type != 'service') {
                            if (product.qty_available && product.qty_available <= 0) {
                                return true
                            } else {
                                return false
                            }
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 2) {
                        if (product.type != 'service') {
                            if (product.qty_available && product.qty_available > 0) {
                                return true
                            } else {
                                return false
                            }
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 3) {
                        if (product.tracking != 'none') {
                            return true
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 4) {
                        if (product.is_combo) {
                            return true
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 5) {
                        if (product.addon_id) {
                            return true
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 6) {
                        if (product.multi_variant) {
                            return true
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 7) {
                        if (product.multi_uom) {
                            return true
                        } else {
                            return false
                        }
                    }
                    if (this.filter && this.sepecialFilter.indexOf(this.filter) == 8) {
                        if (product.barcode_ids && product.barcode_ids.length != 0) {
                            return true
                        } else {
                            return false
                        }
                    }
                    this.clearSearch()
                    return true;
                };
                const {fieldValue, searchTerm} = this.searchDetails;
                const fieldAccessor = this._searchFields[fieldValue];
                const searchCheck = (product) => {
                    if (!fieldAccessor) return true;
                    const fieldValue = fieldAccessor(product);
                    if (fieldValue === null) return true;
                    if (!searchTerm) return true;
                    return fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm.toLowerCase());
                };
                const predicate = (product) => {
                    return filterCheck(product) && searchCheck(product);
                };
                let products = []
                if (this.filter == 'All Items') {
                    products = this.env.pos.db.get_product_by_category(0);
                } else {
                    products = this.env.pos.db.getAllProducts();
                }
                products = products.filter(predicate);
                this.env.pos.set('search_extends_results', products)
                posbus.trigger('reload-products-screen')
                posbus.trigger('remove-filter-attribute')
            }
        }
    Registries.Component.extend(ProductsWidgetControlPanel, RetailProductsWidgetControlPanel);

    return RetailProductsWidgetControlPanel;
});
