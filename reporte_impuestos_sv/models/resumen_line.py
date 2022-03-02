# -*- coding: utf-8 -*-
from odoo import models, fields, _


class resumen_line(models.Model):
    _name = 'resumen.line'
    _inherit = ['mail.thread', 'mail.activity.mixin', 'portal.mixin']  ### Redes Sociales
    _description = "Resumen de Libro de Iva"

    company_id = fields.Many2one('res.company',
                                 string='Company',
                                 change_default=True,
                                 required=True,
                                 readonly=True,
                                 states={'draft': [('readonly', False)]},
                                 default=lambda self: self.env['res.company']._company_default_get('resumen.line'))

    company_currency_id = fields.Many2one('res.currency',
                                          related='company_id.currency_id',
                                          string="Company Currency",
                                          readonly=True)
    libro_iva_id = fields.Many2one('libro.iva',
                                   _('Referencia de libro'),
                                   required=True,
                                   ondelete='cascade',
                                   index=True,
                                   readonly=True)

    # comunes
    detalle = fields.Char(string=_("Resumen"))

    # contribuyentes
    neto_p = fields.Monetary(_('Valor Neto P'),
                             store=True,
                             currency_field='company_currency_id')
    iva_p = fields.Monetary(_('Debito Fiscal P'),
                            store=True,
                            currency_field='company_currency_id')
    neto_t = fields.Monetary(_('Valor Neto T'),
                             store=True,
                             currency_field='company_currency_id')
    iva_t = fields.Monetary(_('Debito Fiscal T'),
                            store=True,
                            currency_field='company_currency_id')
    iva_retenido = fields.Monetary(_('IVA Retenido'),
                                   store=True,
                                   currency_field='company_currency_id')

    # consumidor
    total = fields.Monetary(_('Total'),
                            store=True,
                            currency_field='company_currency_id', )
    mes = fields.Char(String=_("Mes"))
    year = fields.Char(String=_("Año"))


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    resumen_line_ids = fields.One2many('resumen.line',
                                       'libro_iva_id',
                                       _('Resumen de Libro'),
                                       readonly=True)
