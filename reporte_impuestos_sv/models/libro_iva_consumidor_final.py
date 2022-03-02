# -*- coding: utf-8 -*-

from odoo import models, fields, _


class LibroIvaConsumidorFinal(models.Model):
    _name = 'iva.consumidor.final'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = "Detalle de Consumidor Final"
    _order = 'fecha'

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

    fecha = fields.Date('Fecha')
    # Revisar
    num_inicial = fields.Char(String=_("Del No."))
    num_final = fields.Char(String=_("Al No."))
    caja_sis_compu = fields.Char('No. Caja Sistema Computarizado')
    v_exentas = fields.Monetary(_('Ventas Exentas'),
                                store=True,
                                currency_field='company_currency_id')
    v_internas_gravadas = fields.Monetary(_('Ventas Internas Gravadas'),
                                          store=True,
                                          currency_field='company_currency_id')
    exportaciones = fields.Monetary(_('Exportaciones'),
                                    store=True,
                                    currency_field='company_currency_id')
    total_v_diarias_prop = fields.Monetary(_('Total Ventas Diarias Propias'),
                                           store=True,
                                           currency_field='company_currency_id')
    v_cuentas_terceros = fields.Monetary(_('Ventas a Cuentas de Terceros'),
                                         store=True,
                                         currency_field='company_currency_id')
    libro_iva_id = fields.Many2one('libro.iva', string="Libro de Iva")


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    detalle_iva_consu_final_ids = fields.One2many('iva.consumidor.final',
                                                  'libro_iva_id',
                                                  _('Detalle de Consumidor Final'),
                                                  readonly=True)
