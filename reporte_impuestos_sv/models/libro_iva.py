# -*- coding: utf-8 -*-
import time

from odoo import models, fields, api, _


class LibroIva(models.Model):
    _name = 'libro.iva'
    _inherit = ['mail.thread', 'mail.activity.mixin', 'portal.mixin']  ### Redes Sociales
    _description = "Libros de Iva"
    _order = 'fecha, mes'

    def iva_open(self):
        self.state = "open"

    def iva_cancel(self):
        self.state = "cancel"

    # funciones para obtener valores
    @api.model
    def create(self, vals):

        meses = {
            '01': 'Enero',
            '02': 'Febrero',
            '03': 'Marzo',
            '04': 'Abril',
            '05': 'Mayo',
            '06': 'Junio',
            '07': 'Julio',
            '08': 'Agosto',
            '09': 'Septiembre',
            '10': 'Octubre',
            '11': 'Noviembre',
            '12': 'Diciembre'
        }
        type = {
            'fcf': 'Consumidor Final',
            'ccf': 'Credito Fiscal',
            'compras': 'Compras'
        }
        year = fields.Datetime.from_string(vals.get('fecha')).year
        vals['name'] = type.get(str(vals.get('type'))) + ' - ' + str(year) + ' - ' + meses.get(str(vals.get('mes')))
        libro_id = super(LibroIva, self).create(vals)
        return libro_id

    # campos del encabezado
    name = fields.Char('Nombre', copy=False, default='Libro de Iva', track_visibility='always')
    active = fields.Boolean('Activo', default=True)
    fecha = fields.Date(string=_('Fecha'),
                        index=True,
                        help=_("Fecha de realizado el informe"),
                        copy=False,
                        default=time.strftime('%Y-%m-%d'),
                        track_visibility='onchange')

    company_id = fields.Many2one('res.company',
                                 string=_('Compañia'),
                                 change_default=True,
                                 default=lambda self: self.env.company)

    company_currency_id = fields.Many2one('res.currency',
                                          related='company_id.currency_id',
                                          string="Company Currency",
                                          readonly=True)

    mes = fields.Selection([
        ('01', 'Enero'),
        ('02', 'Febrero'),
        ('03', 'Marzo'),
        ('04', 'Abril'),
        ('05', 'Mayo'),
        ('06', 'Junio'),
        ('07', 'Julio'),
        ('08', 'Agosto'),
        ('09', 'Septiembre'),
        ('10', 'Octubre'),
        ('11', 'Noviembre'),
        ('12', 'Diciembre'),
    ], string=_("Mes"),
        index=True,
        # Agregar context_today
        default=time.strftime("%m"),
        copy=False,
        required=True,
        track_visibility='onchange')

    state = fields.Selection([
        ('draft', _('Borrador')),
        ('open', _('Validado')),
        ('cancel', _('Cancelado')),
    ], string=_('Estado'), index=True, readonly=True, default='draft',
        track_visibility='onchange', copy=False,
        help=_(" * El Borrador sirve para verificar la informacion correspondiente.\n"
               " * El Validado sirve para dar por realizado el libro de iva.\n"
               " * El cancelado se hace cuando ha fallado un libro."))

    responsable_id = fields.Many2one('res.users',
                                     _('Contador'),
                                     required=True,
                                     readonly=True,
                                     states={'draft': [('readonly', False)]},
                                     help=_("Seleccione la persona que validara el libro"),
                                     track_visibility='always')

    usuario_id = fields.Many2one('res.users', string=_('Asistente'),
                                 readonly=True, default=lambda self: self.env.user)

    type = fields.Selection([
        ('fcf', 'Libro Consumidor Final'),
        ('ccf', 'Libro Credito Fiscal'),
        ('compras', 'Libro de Compras')],
        string=None,
        default=lambda self: self._context.get('type', 'fcf'), )

    def change_active(self):
        if self.active:
            self.active = False
        else:
            self.active = True

    def iva_print(self):
        if self.type == 'fcf':
            return self.env.ref('reporte_impuestos_sv.libro_iva_fcf').report_action(self)
        if self.type == 'ccf':
            return self.env.ref('reporte_impuestos_sv.libro_iva_ccf').report_action(self)
        if self.type == 'compras':
            return self.env.ref('reporte_impuestos_sv.libro_iva_compras').report_action(self)
