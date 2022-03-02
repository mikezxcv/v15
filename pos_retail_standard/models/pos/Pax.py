# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api
import urllib.request
import base64

import logging

_logger = logging.getLogger(__name__)


class PaxTerminal(models.Model):
    _name = 'pax.terminal'
    _rec_name = 'ip_addr'
    _description = "Pax Terminal Device"

    ip_addr = fields.Char(
        string="PAX Device IP Address",
        required="1",
        help='IP address of Pax Device, when you plus Lan Network to Pax and booting, you will see it. \n'
             'Example: 192.168.31.60'
    )
    protocol = fields.Char(
        string="Device Protocol (Port)",
        required="1",
        default=10009
    )

    def encodeValue(self, posParameter):
        paxParam = []
        for info_index, info_group in enumerate(posParameter):
            paxParam.append(u'\u001c')
            if isinstance(posParameter[info_group], str):
                paxParam.append(posParameter[info_group])
                continue
            for value_index, value in enumerate(posParameter[info_group]):
                if value_index != 0:
                    paxParam.append(u'\u001f')
                paxParam.append(posParameter[info_group][value])
        paxParam[0] = u'\u0002'
        paxParam = bytearray("".join(paxParam), 'utf-8')
        paxParam += bytes(self.getCheckCharacter(paxParam), 'utf-8')
        paxParam = base64.b64encode(paxParam)
        result = paxParam.decode()
        return result

    def getCheckCharacter(self, paxParam):
        checkCharacter = 0
        paxParam = iter(paxParam)
        next(paxParam)
        for x in paxParam:
            checkCharacter ^= x
        checkCharacter ^= 3

        checkCharacter = u'\u0003' + chr(checkCharacter)
        if checkCharacter == 0:
            checkCharacter = 0
        return checkCharacter

    @api.model
    def payment_process(self, id, amount, test=False):
        _logger.info('Begin [payment_process] with Amount %s' % amount)
        if test:
            return {
                'response': 'ABORTED',
                'amount': amount,
            }
        vals = {}
        try:
            rec = self.browse(id)
            link = 'http://' + rec.ip_addr + ':' + rec.protocol + '/?AlQwMBwxLjI4HDAxHDEwMBwcMRwcHBwcA0M='
            _logger.info('{paid via link} %s' % link)
            htmlfile = urllib.request.urlopen(link)
            htmltext = htmlfile.read()
            htmltext = str(htmltext)
            if htmltext.find('ABORTED') != -1:
                vals.update({'response': 'ABORTED'})
                vals.update({'amount': amount})
            elif htmltext.find('TIMEOUT') != -1:
                vals.update({'response': 'TIMEOUT'})
        except Exception as e:
            _logger.error(e)
            vals.update({'response': 'TIMEOUT'})
        return vals


class PaxPayment(models.Model):
    _name = 'pax.payment'
    _description = "Pax Payment"
    _rec_name = "amount"

    amount = fields.Float(string="Amount")

    def payment_process(self):
        ip = self.env['pax.terminal'].search([])
        dev_ip = None
        dev_protocol = None
        for i in ip:
            dev_ip = i.ip_addr
            dev_protocol = i.protocol
        if dev_ip and dev_protocol:
            link = 'http://' + dev_ip + ':' + dev_protocol + '/?AlQwMBwxLjI4HDAxHDEwMBwcMRwcHBwcA0M='
            _logger.info('[payment_process] %s' % link)
            htmlfile = urllib.request.urlopen(link)
            htmltext = htmlfile.read()
            print("########## Return Result From PAX ########### ", htmltext)
