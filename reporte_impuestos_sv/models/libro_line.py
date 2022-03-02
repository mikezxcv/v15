# -*-conding:utf-8-*-
from odoo import models, fields, _


class libro_line(models.Model):
    _name = 'libro.line'
    _inherit = ['mail.thread', 'mail.activity.mixin', 'portal.mixin']  ### Redes Sociales
    _description = "Ventas al contado"
    _order = 'fecha_doc, correlativo, num_doc'

    libro_iva_id = fields.Many2one('libro.iva',
                                   'Referencia de libro',
                                   required=True,
                                   ondelete='cascade')

    company_id = fields.Many2one('res.company',
                                 string='Company',
                                 change_default=True,
                                 required=True,
                                 readonly=True,
                                 states={'draft': [('readonly', False)]},
                                 default=lambda self: self.env['res.company']._company_default_get('libro.line'))

    company_currency_id = fields.Many2one('res.currency',
                                          related='company_id.currency_id',
                                          string="Company Currency",
                                          readonly=True)

    # comunes
    # type =
    retenciones = fields.Monetary(_('Retenciones'),
                                  store=True,
                                  currency_field='company_currency_id')
    totales = fields.Monetary(_('Totales'),
                              store=True,
                              currency_field='company_currency_id')
    # exentas_p = fields.Monetary(_('Ventas Exentas'), store=True,
    # currency_field='company_currency_id', readonly=True)
    exentas_nosujetas = fields.Monetary(_('Ventas Exentas'),
                                        store=True,
                                        currency_field='company_currency_id')
    correlativo = fields.Char(String=_("No."))
    fecha_doc = fields.Date(string=_('Fecha de Emision'), )
    num_doc = fields.Char(String=_("Numero de Documento"))
    name = fields.Char(String=_("Nombre"))
    nrc = fields.Char(String=_("NRC"))
    nit = fields.Char(String=_("NIT"))
    dui = fields.Char(String=_("DUI"))

    gravadas = fields.Monetary(_('Gravadas'),
                               store=True,
                               currency_field='company_currency_id')
    retenciones = fields.Monetary(_('Impuesto Retenido a Terceros'),
                                  store=True,
                                  currency_field='company_currency_id')

    # contribuyente
    prefijo = fields.Char(String=_("Prefijo o Serie"))
    n_form_unico = fields.Char(String=_("No Control Interno Sistema Formulario Unico"))
    debito_fiscal = fields.Monetary(_('Debito Fiscal'),
                                    store=True,
                                    currency_field='company_currency_id')
    # compras
    internas_e = fields.Monetary(_('Internas Exentas'),
                                 store=True,
                                 currency_field='company_currency_id')
    importaciones_e = fields.Monetary(_('Importaciones Exentas'),
                                      store=True,
                                      currency_field='company_currency_id')
    internas_g = fields.Monetary(_('Internas Gravadas'),
                                 store=True,
                                 currency_field='company_currency_id')
    importaciones_g = fields.Monetary(_('Importaciones Gravadas'),
                                      store=True,
                                      currency_field='company_currency_id')
    iva_importacion = fields.Monetary(_('IVA de Importaciones'),
                                      store=True,
                                      currency_field='company_currency_id')
    iva_credito_g = fields.Monetary(_('Credito Fiscal'),
                                    store=True,
                                    currency_field='company_currency_id')
    percepcion = fields.Monetary(_('Percepciones'),
                                 store=True,
                                 currency_field='company_currency_id')
    excluidas = fields.Monetary(_('Compras Excluidas'),
                                store=True,
                                currency_field='company_currency_id')

    # consumidor
    dia = fields.Char(String=_("Dia"))
    num_inicial = fields.Char(String=_("Del No."))
    num_final = fields.Char(String=_("Al No."))
    n_maq_caja = fields.Char(String=_("No. Maquina o Caja Registradora"))
    exportaciones = fields.Monetary(_('Exportaciones'),
                                    store=True,
                                    currency_field='company_currency_id', )
    v_c_ter = fields.Monetary(_('Ventas por Cuenta de Terceros'),
                              store=True,
                              currency_field='company_currency_id')
