# -*- coding: utf-8 -*-
from odoo import fields, models, api


class Partner(models.Model):
    _name = 'res.partner'
    _inherit = ['res.partner', 'phone.validation.mixin']
    # Datos Personales
    nrc = fields.Char(string="N.R.C.")
    giro = fields.Char(string="Giro")
    # Datos de contacto
    fax = fields.Char(string="Fax")
    pbx = fields.Char(string="PBX")
    extension = fields.Char(string="Extension")
    directo = fields.Char(string="Directo")

    @api.onchange('pbx', 'fax', 'country_id', 'company_id')
    def _onchange_phone_validation(self):
        if self.pbx:
            self.pbx = self.phone_format(self.pbx)
        if self.fax:
            self.fax = self.phone_format(self.fax)

    def _display_address(self, without_company=False):

        '''
        The purpose of this function is to build and return an address formatted accordingly to the
        standards of the country where it belongs.

        :param address: browse record of the res.partner to format
        :returns: the address formatted in a display that fit its country habits (or the default ones
            if not country is specified)
        :rtype: string
        '''
        # get the information that will be injected into the display format
        # get the address format
        address_format = self._get_address_format()
        args = {
            'munic_name': self.munic_id.name or '',
            'state_code': self.state_id.code or '',
            'state_name': self.state_id.name or '',
            'country_code': self.country_id.code or '',
            'country_name': self._get_country_name(),
            'company_name': self.commercial_company_name or '',
        }
        for field in self._formatting_address_fields():
            args[field] = getattr(self, field) or ''
        if without_company:
            args['company_name'] = ''
        elif self.commercial_company_name:
            address_format = '%(company_name)s\n' + address_format
        return address_format % args
