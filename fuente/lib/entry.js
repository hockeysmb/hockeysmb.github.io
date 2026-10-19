import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
window.SMBAvatar = (opts) => createAvatar(avataaars, opts).toString();
