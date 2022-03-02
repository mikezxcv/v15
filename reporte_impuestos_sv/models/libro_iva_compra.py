# -*- coding: utf-8 -*-

from odoo import models, fields, _


class LibroIvaCompra(models.Model):
    _name = 'libro.iva.compra'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = "Libro de iva Compras"
    _order = 'fecha_emision'

    company_id = fields.Many2one('res.company',
                                 string=_('Compañia'),
                                 change_default=True,
                                 required=True,
                                 readonly=True,
                                 states={'draft': [('readonly', False)]},
                                 default=lambda self: self.env.company)

    company_currency_id = fields.Many2one('res.currency',
                                          related='company_id.currency_id',
                                          string=_("Moneda de Compañia"),
                                          readonly=True)

    correlativo = fields.Char("No")
    fecha_emision = fields.Date("Fecha Emision")
    num_doc = fields.Char("Num documento")

    partner_id = fields.Many2one('res.partner', "Proveedor")
    nrc = fields.Char(string="N.R.C",
                      related="partner_id.nrc")

    '''nit = fields.Char(string="N.I.T",
                      related="partner_id.nit")
    
    dui = fields.Char(string="D.U.I",
                      related="partner_id.dui")'''
    # compras Excentas
    internas_e = fields.Monetary(_('Internas Exentas'),
                                 store=True,
                                 currency_field='company_currency_id')
    importaciones_e = fields.Monetary(_('Importaciones Exentas'),
                                      store=True,
                                      currency_field='company_currency_id')

    # Compras Gravadas
    internas_g = fields.Monetary(_('Internas Gravadas'),
                                 store=True,
                                 currency_field='company_currency_id')
    importaciones_g = fields.Monetary(_('Importaciones Gravadas'),
                                      store=True,
                                      currency_field='company_currency_id')
    credito_fiscal = fields.Monetary(_('Credito Fiscal'),
                                     store=True,
                                     currency_field='company_currency_id')

    anticipo_iva_ret = fields.Monetary(_("I.V.A. Retenido"),
                                       store=True,
                                       currency_field='company_currency_id')
    anticipo_iva_rec = fields.Monetary(_("I.V.A. Percibido"),
                                       store=True,
                                       currency_field='company_currency_id')
    total_compras = fields.Monetary(_("Total"),
                                    store=True,
                                    currency_field='company_currency_id')
    compra_suj_e = fields.Monetary(_("Compra Sujetos Excluidos"),
                                   store=True,
                                   currency_field='company_currency_id')
    libro_iva_id = fields.Many2one('libro.iva', string="Libro de Iva")


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    detalle_iva_compra_ids = fields.One2many('libro.iva.compra',
                                             'libro_iva_id',
                                             _('Detalle de Compra'),
                                             readonly=True)
