# -*- coding: utf-8 -*-

from odoo import models, fields, _


class LibroIvaCreditoFiscal(models.Model):
    _name = 'iva.credito.fiscal'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = "Detalle Iva Credito Fiscal"
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

    correlativo = fields.Char(_("Correlativo"))
    fecha_emision = fields.Date(_("Fecha de Emision"))
    num_corr_preimp = fields.Char(_("Numero Correlativo Pre Impreso"))
    num_ctrl_sist_form_uni = fields.Char(_("Numero Control Interno Sistema Formulario Unico"))
    partner_id = fields.Many2one('res.partner', _("Cliente"))
    nrc = fields.Char(string=_("N.R.C"),
                      related="partner_id.nrc")

    prp_exentas = fields.Monetary(_('Propias Exentas'),
                                  store=True,
                                  currency_field='company_currency_id')
    prp_gravadas = fields.Monetary(_('Propias Gravadas'),
                                   store=True,
                                   currency_field='company_currency_id')
    prp_debito_fiscal = fields.Monetary(_('Propias Debito Fiscal'),
                                        store=True,
                                        currency_field='company_currency_id')
    vct_exentas = fields.Monetary(_('Terceros Exentas'),
                                  store=True,
                                  currency_field='company_currency_id')
    vct_gravadas = fields.Monetary(_('Terceros Gravadas'),
                                   store=True,
                                   currency_field='company_currency_id')
    vct_debito_fiscal = fields.Monetary(_('Terceros Debito Fiscal'),
                                        store=True,
                                        currency_field='company_currency_id')
    iva_percibido = fields.Monetary(_('I.V.A. Percibido'),
                                    store=True,
                                    currency_field='company_currency_id')
    iva_retenido = fields.Monetary(_('I.V.A. Retenido'),
                                   store=True,
                                   currency_field='company_currency_id')
    total = fields.Monetary(_('Total'),
                            store=True,
                            currency_field='company_currency_id')
    libro_iva_id = fields.Many2one('libro.iva', string="Libro de Iva")


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    detalle_iva_credito_fiscal_ids = fields.One2many('iva.credito.fiscal',
                                                     'libro_iva_id',
                                                     _('Detalle de Creditos Fiscales'),
                                                     readonly=True)
