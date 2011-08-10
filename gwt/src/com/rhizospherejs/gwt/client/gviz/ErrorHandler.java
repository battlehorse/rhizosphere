/*
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

package com.rhizospherejs.gwt.client.gviz;

import com.google.gwt.ajaxloader.client.Properties;
import com.google.gwt.ajaxloader.client.Properties.TypeException;
import com.google.gwt.visualization.client.events.Handler;

/**
 * A handler for error events raised by {@link GVizRhizosphere}. Error events
 * are fired whenever {@link GVizRhizosphere} fails drawing due to problems
 * in the input datatable.
 * <p>
 * See <a href="http://code.google.com/apis/chart/interactive/docs/events.html#errorevent">
 * the error event documentation</a> for further info.
 * 
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public abstract class ErrorHandler extends Handler {
  
  public static class ErrorEvent {
    
    private String id;
    private String message;
    
    ErrorEvent(String id, String message) {
      this.id = id;
      this.message = message;
    }
    
    /**
     * @return The ID of the DOM element containing the error message.
     */
    public String getId() {
      return id;
    }
    
    /**
     * @return  A short message string describing the error.
     */
    public String getMessage() {
      return message;
    }
  }
  
  public abstract void onError(ErrorEvent event);

  @Override
  protected void onEvent(Properties properties) throws TypeException {
    onError(new  ErrorEvent(properties.getString("id"), properties.getString("message")));
  }

}
